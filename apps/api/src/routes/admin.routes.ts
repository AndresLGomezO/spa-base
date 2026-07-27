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
  TenantDeletionArchiveRepository,
  TenantDeletionJobRepository,
  TenantRepository,
} from "@repo/firestore-converters";
import {
  tenantStatusSchema,
  tenantAppearanceSchema,
  aiSpendLimitsSchema,
} from "@repo/shared-types";
import {
  tenantBundleExportDocumentSchema,
  validateTenantBundleImport,
} from "@repo/tenant-bundle";
import { uploadTenantLogo } from "@repo/gcp-firebase";

import { syncThemeAiContextForTenant } from "../ai/sync-tenant-ai-contexts.js";
import type { SyncTenantAiContextsDeps } from "../ai/sync-tenant-ai-contexts.js";
import {
  enqueueTenantDeletion,
  TenantDeletionRequestError,
  parseProtectedTenantIds,
} from "../admin/enqueue-tenant-deletion.js";
import type { createTenantDeletionTasksClient } from "../admin/tenant-deletion-tasks.client.js";
import { loadFormulaAdmin } from "../formulas/load-formula-admin.js";
import { validateActiveTenantIds } from "../admin/list-available-tenants.js";
import { seedTenantRolesFromTemplates } from "../admin/seed-tenant-roles-from-templates.js";
import { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { createRequireSuperAdmin } from "../admin/require-superadmin.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import type { TenantIndexGuard } from "../indexes/create-tenant-index-guard.js";
import {
  IndexCreatingError,
  IndexProvisioningFailedError,
} from "../indexes/index-query-guard.js";

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
  aiLimits: aiSpendLimitsSchema.nullable().optional(),
});

const uploadLogoBodySchema = z.object({
  contentType: z.string().trim().min(1),
  data: z.string().trim().min(1),
});

const importTenantBundleBodySchema = z.object({
  bundle: tenantBundleExportDocumentSchema,
});

const deleteTenantBodySchema = z.object({
  confirmTenantId: z.string().trim().min(1),
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
  tenantIndexGuard?: TenantIndexGuard;
  entityRuntime?: EntityRuntimeContext;
  tenantDeletionJobRepository: TenantDeletionJobRepository;
  tenantDeletionArchiveRepository: TenantDeletionArchiveRepository;
  tenantDeletionTasksClient: ReturnType<typeof createTenantDeletionTasksClient>;
  tenantDeletionProtectedIds?: readonly string[];
}> = async (fastify, opts) => {
  const authenticate = createAuthenticatePreHandler(opts.firebaseAdminConfig, {
    requireTenant: false,
  });
  const requireSuperAdmin = createRequireSuperAdmin(opts.permissionDeps);
  const platformRoleRepository: PlatformRoleRepository =
    createFirestoreAdminPlatformRoleRepository(opts.firebaseAdminConfig);
  const tenantRepository: TenantRepository =
    createFirestoreAdminTenantRepository(opts.firebaseAdminConfig);
  const protectedTenantIds =
    opts.tenantDeletionProtectedIds ??
    parseProtectedTenantIds(
      process.env.TENANT_DELETION_PROTECTED_IDS ?? "",
    );

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
        parsedBody.data.appearance === undefined &&
        parsedBody.data.aiLimits === undefined
      ) {
        return reply.status(400).send({
          ok: false,
          message:
            "Request body must include name, status, appearance, and/or aiLimits.",
        });
      }

      const updated = await tenantRepository.update(parsedParams.data.id, {
        name: parsedBody.data.name,
        status: parsedBody.data.status,
        appearance: parsedBody.data.appearance,
        aiLimits: parsedBody.data.aiLimits,
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
    "/admin/tenants/:id/delete",
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

      const parsedBody = deleteTenantBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(400).send({
          ok: false,
          message: "Request body must include confirmTenantId.",
        });
      }

      try {
        const result = await enqueueTenantDeletion(
          {
            tenantRepository,
            jobRepository: opts.tenantDeletionJobRepository,
            archiveRepository: opts.tenantDeletionArchiveRepository,
            tenantDeletionTasksClient: opts.tenantDeletionTasksClient,
            protectedTenantIds,
          },
          {
            tenantId: parsedParams.data.id,
            confirmTenantId: parsedBody.data.confirmTenantId,
            deletedBy: request.ctx?.uid ?? null,
          },
        );

        return reply.status(202).send({
          ok: true,
          jobId: result.jobId,
          archiveId: result.archiveId,
        });
      } catch (error) {
        if (error instanceof TenantDeletionRequestError) {
          return reply.status(error.statusCode).send({
            ok: false,
            message: error.message,
          });
        }
        const message =
          error instanceof Error
            ? error.message
            : "Unable to enqueue tenant deletion.";
        return reply.status(500).send({ ok: false, message });
      }
    },
  );

  fastify.get(
    "/admin/tenant-deletion-jobs/:jobId",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const paramsSchema = z.object({
        jobId: z.string().trim().min(1),
      });
      const parsedParams = paramsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({
          ok: false,
          message: "Invalid job id.",
        });
      }

      const job = await opts.tenantDeletionJobRepository.getById(
        parsedParams.data.jobId,
      );
      if (!job) {
        return reply.status(404).send({
          ok: false,
          message: "Tenant deletion job not found.",
        });
      }

      if (job.status === "completed" && opts.entityRuntime) {
        opts.entityRuntime.invalidateTenantRuntime(job.tenantId);
      }

      return reply.send({ ok: true, job });
    },
  );

  fastify.get(
    "/admin/tenant-deletion-archives",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (_request, reply) => {
      const archives = await opts.tenantDeletionArchiveRepository.list();
      return reply.send({ ok: true, archives });
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
    "/admin/tenants/:id/bundle",
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

      try {
        const { exportTenantBundle } = await loadFormulaAdmin();
        const bundle = await exportTenantBundle(
          { firebaseAdminConfig: opts.firebaseAdminConfig },
          parsedParams.data.id,
        );
        return reply.send({ ok: true, bundle });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to export tenant bundle.";
        const status = message === "Tenant not found." ? 404 : 400;
        return reply.status(status).send({ ok: false, message });
      }
    },
  );

  fastify.post(
    "/admin/tenants/:id/bundle",
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

      const parsedBody = importTenantBundleBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        const validation = validateTenantBundleImport(
          JSON.stringify(
            typeof request.body === "object" && request.body !== null
              ? (request.body as { bundle?: unknown }).bundle
              : request.body,
          ),
        );
        const message =
          !validation.ok && validation.errors[0]?.message
            ? validation.errors[0].message
            : "Request body must include a valid tenant bundle.";
        return reply.status(400).send({ ok: false, message });
      }

      try {
        if (opts.tenantIndexGuard) {
          await opts.tenantIndexGuard.assertEnvironmentReady(
            parsedParams.data.id,
            "import",
          );
        }
        const { importTenantBundle, validateTenantBundleFormulaReferences } =
          await loadFormulaAdmin();
        const formulaErrors = validateTenantBundleFormulaReferences(
          parsedBody.data.bundle,
        );
        if (formulaErrors.length > 0) {
          return reply.status(400).send({
            ok: false,
            message: formulaErrors[0]?.message ?? "Invalid tenant bundle.",
          });
        }
        const summary = await importTenantBundle(
          {
            firebaseAdminConfig: opts.firebaseAdminConfig,
            tenantAiContextSync: opts.tenantAiContextSync,
            entityRuntime: opts.entityRuntime,
          },
          parsedParams.data.id,
          parsedBody.data.bundle,
        );
        return reply.send({ ok: true, summary });
      } catch (error) {
        if (error instanceof IndexCreatingError) {
          reply.header("Retry-After", String(error.retryAfterSeconds));
          return reply.status(503).send({
            ok: false,
            message: error.message,
            code: error.code,
          });
        }
        if (error instanceof IndexProvisioningFailedError) {
          return reply.status(503).send({
            ok: false,
            message: error.message,
            code: error.code,
            errors: error.errors,
          });
        }
        const message =
          error instanceof Error
            ? error.message
            : "Unable to import tenant bundle.";
        const status = message === "Tenant not found." ? 404 : 400;
        return reply.status(status).send({ ok: false, message });
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
