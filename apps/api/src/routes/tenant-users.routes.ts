import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";
import { z } from "zod";

import { isBuiltInRoleName, type RoleCatalog } from "@repo/rbac";
import type {
  RegisteredUserRepository,
  TenantUserInviteRepository,
} from "@repo/firestore-converters";

import {
  assignTenantUserByEmail,
  listTenantMembers,
  removeTenantMember,
  updateTenantMemberRoles,
} from "../admin/tenant-user-service.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";

interface RegisterTenantUserRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly registeredUserRepository: RegisteredUserRepository;
  readonly tenantUserInviteRepository: TenantUserInviteRepository;
  readonly getRoleCatalog: (tenantId: string) => Promise<RoleCatalog>;
}

const createBodySchema = z.object({
  email: z.string().trim().email(),
  roles: z.array(z.string().trim().min(1)).min(1),
});

const updateBodySchema = z.object({
  roles: z.array(z.string().trim().min(1)).min(1),
});

const listQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
});

function resolveTenantId(
  request: FastifyRequest,
  reply: FastifyReply,
): string | null {
  return requireJwtTenant(request, reply);
}

function isKnownRoleName(name: string, roleCatalog: RoleCatalog): boolean {
  return isBuiltInRoleName(name) || name in roleCatalog;
}

async function validateRoles(
  tenantId: string,
  roles: readonly string[],
  getRoleCatalog: (tenantId: string) => Promise<RoleCatalog>,
): Promise<string | null> {
  const roleCatalog = await getRoleCatalog(tenantId);
  for (const roleName of roles) {
    if (!isKnownRoleName(roleName, roleCatalog)) {
      return `Unknown role: ${roleName}.`;
    }
  }
  return null;
}

export async function registerTenantUserRoutes(
  app: FastifyInstance,
  options: RegisterTenantUserRoutesOptions,
): Promise<void> {
  const requireRead = createRequirePermission(
    options.permissionDeps,
    "tenantUser.read",
  );
  const requireCreate = createRequirePermission(
    options.permissionDeps,
    "tenantUser.create",
  );
  const requireUpdate = createRequirePermission(
    options.permissionDeps,
    "tenantUser.update",
  );
  const requireRemove = createRequirePermission(
    options.permissionDeps,
    "tenantUser.remove",
  );

  app.get(
    "/api/tenant-users",
    { preHandler: [options.authenticate, requireRead] },
    async (request, reply) => {
      const tenantId = resolveTenantId(request, reply);
      if (!tenantId) return;

      const parsedQuery = listQuerySchema.safeParse(request.query);
      const search = parsedQuery.success
        ? parsedQuery.data.search?.trim().toLowerCase()
        : undefined;

      const [members, invites] = await Promise.all([
        listTenantMembers({
          registeredUserRepository: options.registeredUserRepository,
          tenantId,
        }),
        options.tenantUserInviteRepository.list(tenantId),
      ]);

      const filteredMembers = search
        ? members.filter((member) => {
            const email = member.email?.toLowerCase() ?? "";
            const displayName = member.displayName?.toLowerCase() ?? "";
            const uid = member.uid.toLowerCase();
            return (
              email.includes(search) ||
              displayName.includes(search) ||
              uid.includes(search)
            );
          })
        : members;

      return reply.send(
        successEnvelope({
          members: filteredMembers,
          invites: invites.map((invite) => ({
            id: invite.id,
            email: invite.email,
            roles: invite.roles,
            createdAt: invite.createdAt,
          })),
        }),
      );
    },
  );

  app.post(
    "/api/tenant-users",
    { preHandler: [options.authenticate, requireCreate] },
    async (request, reply) => {
      const tenantId = resolveTenantId(request, reply);
      if (!tenantId) return;

      const parsed = createBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request body.",
        );
      }

      const roleError = await validateRoles(
        tenantId,
        parsed.data.roles,
        options.getRoleCatalog,
      );
      if (roleError) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          roleError,
        );
      }

      try {
        const result = await assignTenantUserByEmail({
          registeredUserRepository: options.registeredUserRepository,
          tenantUserInviteRepository: options.tenantUserInviteRepository,
          tenantId,
          email: parsed.data.email,
          roles: parsed.data.roles,
        });
        return reply.status(201).send(successEnvelope(result));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to assign user.";
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }
    },
  );

  app.patch(
    "/api/tenant-users/:uid",
    { preHandler: [options.authenticate, requireUpdate] },
    async (request, reply) => {
      const tenantId = resolveTenantId(request, reply);
      if (!tenantId) return;

      const uid = (request.params as { uid?: string }).uid?.trim();
      if (!uid) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "User id is required.",
        );
      }

      const parsed = updateBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request body.",
        );
      }

      const roleError = await validateRoles(
        tenantId,
        parsed.data.roles,
        options.getRoleCatalog,
      );
      if (roleError) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          roleError,
        );
      }

      const updated = await updateTenantMemberRoles({
        registeredUserRepository: options.registeredUserRepository,
        tenantId,
        uid,
        roles: parsed.data.roles,
      });
      if (!updated) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "User not found.",
        );
      }

      return reply.send(
        successEnvelope({ uid: updated.uid, roles: parsed.data.roles }),
      );
    },
  );

  app.delete(
    "/api/tenant-users/:uid",
    { preHandler: [options.authenticate, requireRemove] },
    async (request, reply) => {
      const tenantId = resolveTenantId(request, reply);
      if (!tenantId) return;

      const uid = (request.params as { uid?: string }).uid?.trim();
      if (!uid) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "User id is required.",
        );
      }

      const updated = await removeTenantMember({
        registeredUserRepository: options.registeredUserRepository,
        tenantId,
        uid,
      });
      if (!updated) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "User not found.",
        );
      }

      return reply.send(successEnvelope({ uid: updated.uid }));
    },
  );
}
