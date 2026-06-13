import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { isBuiltInRoleName, type RoleCatalog } from "@repo/rbac";
import {
  createFirestoreAdminPlatformRoleRepository,
  createFirestoreAdminTenantRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import type {
  PlatformRoleRepository,
  RegisteredUserRepository,
  TenantRepository,
} from "@repo/firestore-converters";
import { tenantStatusSchema, tenantAppearanceSchema } from "@repo/shared-types";
import { uploadTenantLogo } from "@repo/gcp-firebase";

import { syncThemeAiContextForTenant } from "../ai/sync-tenant-ai-contexts.js";
import type { SyncTenantAiContextsDeps } from "../ai/sync-tenant-ai-contexts.js";
import { validateActiveTenantIds } from "../admin/list-available-tenants.js";
import { seedTenantRolesFromTemplates } from "../admin/seed-tenant-roles-from-templates.js";
import { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { createRequireSuperAdmin } from "../admin/require-superadmin.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";

const updateUserAccessBodySchema = z.object({
  tenants: z.record(
    z.string().trim().min(1),
    z.array(z.string().trim().min(1)),
  ),
});

const createTenantBodySchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
});

const updateTenantBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  status: tenantStatusSchema.optional(),
  appearance: tenantAppearanceSchema.nullable().optional(),
});

const uploadLogoBodySchema = z.object({
  contentType: z.string().trim().min(1),
  data: z.string().trim().min(1),
});

function isKnownRoleName(name: string, roleCatalog: RoleCatalog): boolean {
  return isBuiltInRoleName(name) || name in roleCatalog;
}

async function validateTenantRolesForTenants(
  tenants: Record<string, string[]>,
  getRoleCatalog: (tenantId: string) => Promise<RoleCatalog>,
): Promise<string | null> {
  for (const [tenantId, roles] of Object.entries(tenants)) {
    if (tenantId.trim().length === 0) {
      return "Tenant id must not be empty.";
    }

    const roleCatalog = await getRoleCatalog(tenantId);
    for (const roleName of roles) {
      if (!isKnownRoleName(roleName, roleCatalog)) {
        return `Unknown role: ${roleName} for tenant ${tenantId}.`;
      }
    }
  }

  return null;
}

export const adminRoutes: FastifyPluginAsync<{
  firebaseAdminConfig: FirebaseAdminConfig;
  registeredUserRepository: RegisteredUserRepository;
  permissionDeps: LoadRequestPermissionsDeps;
  tenantAiContextSync?: SyncTenantAiContextsDeps;
}> = async (fastify, opts) => {
  const authenticate = createAuthenticatePreHandler(opts.firebaseAdminConfig, {
    requireTenant: false,
  });
  const requireSuperAdmin = createRequireSuperAdmin(opts.permissionDeps);
  const platformRoleRepository: PlatformRoleRepository =
    createFirestoreAdminPlatformRoleRepository(opts.firebaseAdminConfig);
  const tenantRepository: TenantRepository =
    createFirestoreAdminTenantRepository(opts.firebaseAdminConfig);

  fastify.get(
    "/admin/roles",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (_request, reply) => {
      const roles = await platformRoleRepository.listGlobal();
      return reply.send({ ok: true, roles });
    },
  );

  fastify.get(
    "/admin/tenants",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (_request, reply) => {
      const tenants = await tenantRepository.list();
      return reply.send({ ok: true, tenants });
    },
  );

  fastify.get(
    "/admin/tenants/:id",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().trim().min(1),
      });
      const parsedParams = paramsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({
          ok: false,
          message: "Invalid tenant id.",
        });
      }

      const tenant = await tenantRepository.getById(parsedParams.data.id);
      if (!tenant) {
        return reply.status(404).send({
          ok: false,
          message: "Tenant not found.",
        });
      }

      return reply.send({ ok: true, tenant });
    },
  );

  fastify.post(
    "/admin/tenants",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const parsedBody = createTenantBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(400).send({
          ok: false,
          message: "Request body must include a tenant name.",
        });
      }

      try {
        const tenant = await tenantRepository.create({
          id: parsedBody.data.id,
          name: parsedBody.data.name,
          createdBy: request.ctx?.uid ?? null,
        });

        await seedTenantRolesFromTemplates(opts.firebaseAdminConfig, tenant.id);

        return reply.status(201).send({ ok: true, tenant });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to create tenant.";
        return reply.status(400).send({ ok: false, message });
      }
    },
  );

  fastify.patch(
    "/admin/tenants/:id",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().trim().min(1),
      });
      const parsedParams = paramsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({
          ok: false,
          message: "Invalid tenant id.",
        });
      }

      const parsedBody = updateTenantBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(400).send({
          ok: false,
          message: "Request body must include name and/or status.",
        });
      }

      if (
        parsedBody.data.name === undefined &&
        parsedBody.data.status === undefined &&
        parsedBody.data.appearance === undefined
      ) {
        return reply.status(400).send({
          ok: false,
          message: "Request body must include name, status, and/or appearance.",
        });
      }

      const updated = await tenantRepository.update(parsedParams.data.id, {
        name: parsedBody.data.name,
        status: parsedBody.data.status,
        appearance: parsedBody.data.appearance,
      });

      if (!updated) {
        return reply.status(404).send({
          ok: false,
          message: "Tenant not found.",
        });
      }

      if (
        parsedBody.data.appearance !== undefined &&
        opts.tenantAiContextSync
      ) {
        await syncThemeAiContextForTenant(
          opts.tenantAiContextSync,
          parsedParams.data.id,
        );
      }

      return reply.send({ ok: true, tenant: updated });
    },
  );

  fastify.post(
    "/admin/tenants/:id/logo",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().trim().min(1),
      });
      const parsedParams = paramsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({
          ok: false,
          message: "Invalid tenant id.",
        });
      }

      const parsedBody = uploadLogoBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(400).send({
          ok: false,
          message: "Request body must include contentType and base64 data.",
        });
      }

      const tenant = await tenantRepository.getById(parsedParams.data.id);
      if (!tenant) {
        return reply.status(404).send({
          ok: false,
          message: "Tenant not found.",
        });
      }

      try {
        const buffer = Buffer.from(parsedBody.data.data, "base64");
        const objectId = randomUUID();
        const logoUrl = await uploadTenantLogo({
          config: opts.firebaseAdminConfig,
          tenantId: parsedParams.data.id,
          objectId,
          buffer,
          contentType: parsedBody.data.contentType,
        });

        const updated = await tenantRepository.update(parsedParams.data.id, {
          appearance: {
            ...tenant.appearance,
            logoUrl,
          },
        });

        if (opts.tenantAiContextSync) {
          await syncThemeAiContextForTenant(
            opts.tenantAiContextSync,
            parsedParams.data.id,
          );
        }

        return reply.send({ ok: true, logoUrl, tenant: updated });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to upload logo.";
        return reply.status(400).send({ ok: false, message });
      }
    },
  );

  fastify.get(
    "/admin/users",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const querySchema = z.object({
        limit: z.coerce.number().int().positive().max(100).optional(),
        cursor: z.string().trim().min(1).optional(),
      });
      const parsedQuery = querySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.status(400).send({
          ok: false,
          message: "Invalid query parameters.",
        });
      }

      const result = await opts.registeredUserRepository.list(parsedQuery.data);
      return reply.send({
        ok: true,
        items: result.items.map((user) => ({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          platformRole: user.platformRole ?? null,
          tenants: user.tenants ?? {},
        })),
        nextCursor: result.nextCursor,
      });
    },
  );

  fastify.patch(
    "/admin/users/:uid",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const paramsSchema = z.object({
        uid: z.string().trim().min(1),
      });
      const parsedParams = paramsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({
          ok: false,
          message: "Invalid user id.",
        });
      }

      const parsedBody = updateUserAccessBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(400).send({
          ok: false,
          message: "Request body must include tenants mapping.",
        });
      }

      const roleValidationError = await validateTenantRolesForTenants(
        parsedBody.data.tenants,
        opts.permissionDeps.getRoleCatalog,
      );
      if (roleValidationError) {
        return reply.status(400).send({
          ok: false,
          message: roleValidationError,
        });
      }

      const tenantValidationError = await validateActiveTenantIds({
        config: opts.firebaseAdminConfig,
        tenantIds: Object.keys(parsedBody.data.tenants),
      });
      if (tenantValidationError) {
        return reply.status(400).send({
          ok: false,
          message: tenantValidationError,
        });
      }

      const updated = await opts.registeredUserRepository.updateAccess(
        parsedParams.data.uid,
        { tenants: parsedBody.data.tenants },
      );

      if (!updated) {
        return reply.status(404).send({
          ok: false,
          message: "User not found.",
        });
      }

      opts.permissionDeps.invalidateUserAccessCache?.(parsedParams.data.uid);

      return reply.send({
        ok: true,
        user: {
          uid: updated.uid,
          email: updated.email,
          displayName: updated.displayName,
          platformRole: updated.platformRole ?? null,
          tenants: updated.tenants ?? {},
        },
      });
    },
  );
};
