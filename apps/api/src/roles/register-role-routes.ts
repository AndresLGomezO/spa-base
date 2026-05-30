import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  createTenantRoleInputSchema,
  patchTenantRoleInputSchema,
} from "@repo/rbac";
import type { TenantRoleRepository } from "@repo/firestore-converters";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireTargetTenant } from "../auth/resolve-target-tenant-id.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { TenantRoleCatalogLoader } from "../rbac/role-catalog.js";
import {
  assertBuiltInRolePatch,
  assertCustomRoleName,
  validateRoleFieldRules,
  validateRoleGrants,
} from "./validate-role-input.js";

interface RegisterRoleRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
  readonly tenantRoleRepository: TenantRoleRepository;
  readonly tenantRoleCatalogLoader: TenantRoleCatalogLoader;
}

const tenantIdQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
});

function getAvailableEntities(
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
): ReadonlyArray<{
  readonly name: string;
  readonly fields: readonly string[];
}> {
  return entityRuntime.getEntitiesForTenant(tenantId).map((entity) => ({
    name: entity.name,
    fields: Object.keys(entity.metadata.fields),
  }));
}

export async function registerRoleRoutes(
  app: FastifyInstance,
  options: RegisterRoleRoutesOptions,
): Promise<void> {
  const requireRoleRead = createRequirePermission(
    options.permissionDeps,
    "role.read",
  );
  const requireRoleCreate = createRequirePermission(
    options.permissionDeps,
    "role.create",
  );
  const requireRoleUpdate = createRequirePermission(
    options.permissionDeps,
    "role.update",
  );

  app.get(
    "/api/roles",
    { preHandler: [options.authenticate, requireRoleRead] },
    async (request, reply) => {
      const parsedQuery = tenantIdQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid query parameters.",
        );
      }

      const tenantId = requireTargetTenant(
        request,
        reply,
        parsedQuery.data.tenantId,
      );
      if (!tenantId) return;

      const items = await options.tenantRoleRepository.list(tenantId);
      return reply.send(successEnvelope({ items }));
    },
  );

  app.get(
    "/api/roles/:id",
    { preHandler: [options.authenticate, requireRoleRead] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      const parsedQuery = tenantIdQuerySchema.safeParse(request.query);
      if (!parsedParams.success || !parsedQuery.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const tenantId = requireTargetTenant(
        request,
        reply,
        parsedQuery.data.tenantId,
      );
      if (!tenantId) return;

      const item = await options.tenantRoleRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!item) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Role not found.",
        );
      }

      return reply.send(successEnvelope(item));
    },
  );

  app.post(
    "/api/roles",
    { preHandler: [options.authenticate, requireRoleCreate] },
    async (request, reply) => {
      const parsedBody = createTenantRoleInputSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Validation failed.",
          parsedBody.error.flatten(),
        );
      }

      const tenantId = requireTargetTenant(
        request,
        reply,
        parsedBody.data.tenantId,
      );
      if (!tenantId) return;

      if (parsedBody.data.tenantId && request.ctx?.isSuperAdmin !== true) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.FORBIDDEN,
          "Only superadmin may target another tenant.",
        );
      }

      const reservedNameError = assertCustomRoleName(parsedBody.data.name);
      if (reservedNameError) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          reservedNameError,
        );
      }

      const existing = await options.tenantRoleRepository.getByName(
        tenantId,
        parsedBody.data.name,
      );
      if (existing) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          `Role "${parsedBody.data.name}" already exists.`,
        );
      }

      const knownPermissions =
        options.entityRuntime.getKnownPermissions(tenantId);
      const grantError = validateRoleGrants(
        parsedBody.data.grants,
        knownPermissions,
      );
      if (grantError) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          grantError,
        );
      }

      await options.entityRuntime.loadTenantDefinitions(tenantId);
      const fieldRuleError = validateRoleFieldRules(
        parsedBody.data.fieldRules,
        getAvailableEntities(options.entityRuntime, tenantId),
      );
      if (fieldRuleError) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          fieldRuleError,
        );
      }

      const created = await options.tenantRoleRepository.create(
        tenantId,
        parsedBody.data,
      );
      options.tenantRoleCatalogLoader.invalidate(tenantId);
      return reply.status(201).send(successEnvelope(created));
    },
  );

  app.patch(
    "/api/roles/:id",
    { preHandler: [options.authenticate, requireRoleUpdate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      const parsedBody = patchTenantRoleInputSchema.safeParse(request.body);
      const parsedQuery = tenantIdQuerySchema.safeParse(request.query);
      if (
        !parsedParams.success ||
        !parsedBody.success ||
        !parsedQuery.success
      ) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const tenantId = requireTargetTenant(
        request,
        reply,
        parsedQuery.data.tenantId,
      );
      if (!tenantId) return;

      const current = await options.tenantRoleRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Role not found.",
        );
      }

      const builtInPatchError = assertBuiltInRolePatch(
        current.id,
        parsedBody.data,
      );
      if (builtInPatchError) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          builtInPatchError,
        );
      }

      const nextGrants = parsedBody.data.grants ?? current.grants;
      const knownPermissions =
        options.entityRuntime.getKnownPermissions(tenantId);
      const grantError = validateRoleGrants(nextGrants, knownPermissions);
      if (grantError) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          grantError,
        );
      }

      await options.entityRuntime.loadTenantDefinitions(tenantId);
      const nextFieldRules =
        parsedBody.data.fieldRules !== undefined
          ? parsedBody.data.fieldRules
          : current.fieldRules;
      const fieldRuleError = validateRoleFieldRules(
        nextFieldRules,
        getAvailableEntities(options.entityRuntime, tenantId),
      );
      if (fieldRuleError) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          fieldRuleError,
        );
      }

      const updated = await options.tenantRoleRepository.update(
        tenantId,
        parsedParams.data.id,
        parsedBody.data,
      );
      options.tenantRoleCatalogLoader.invalidate(tenantId);
      return reply.send(successEnvelope(updated));
    },
  );
}
