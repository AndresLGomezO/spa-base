import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  createDataHookInputSchema,
  HookExecutionError,
  patchDataHookInputSchema,
  validateCreateDataHookInput,
  validateDataHookActions,
  validateDataHookEntity,
  validateDataHooksCatalogEnvelope,
} from "@repo/hooks";

import {
  decodeHookExecutionListCursor,
  encodeHookExecutionListCursor,
} from "@repo/firestore-converters";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { DataHookExecutionRepository } from "@repo/firestore-converters";
import type { HookRuntimeContext } from "./hook-runtime-context.js";
import {
  DataHookCatalogReplaceError,
  replaceDataHooksCatalog,
} from "./replace-data-hooks-catalog.js";
import type { TenantIndexGuard } from "../indexes/create-tenant-index-guard.js";

import type { FormulaRuntimeContext } from "../formulas/formula-runtime-context.js";

interface RegisterHookRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
  readonly hookRuntime: HookRuntimeContext;
  readonly formulaRuntime: FormulaRuntimeContext;
  readonly hookExecutionRepository: DataHookExecutionRepository;
  readonly tenantIndexGuard?: TenantIndexGuard;
}

const listQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  entity: z.string().trim().min(1).optional(),
});

const catalogQuerySchema = z.object({
  entity: z.string().trim().min(1).optional(),
});

const executionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().trim().optional(),
});

function getAvailableEntityNames(
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
): readonly string[] {
  return entityRuntime
    .getEntitiesForTenant(tenantId)
    .map((entity) => entity.name);
}

export async function registerHookRoutes(
  app: FastifyInstance,
  options: RegisterHookRoutesOptions,
): Promise<void> {
  const requireHookRead = createRequirePermission(
    options.permissionDeps,
    "hook.read",
  );
  const requireHookCreate = createRequirePermission(
    options.permissionDeps,
    "hook.create",
  );
  const requireHookUpdate = createRequirePermission(
    options.permissionDeps,
    "hook.update",
  );
  const requireHookDelete = createRequirePermission(
    options.permissionDeps,
    "hook.delete",
  );

  app.get(
    "/api/data-hooks",
    {
      preHandler: [options.authenticate, requireHookRead],
    },
    async (request, reply) => {
      const parsedQuery = listQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid query parameters.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      await options.hookRuntime.ensureTenantHooksLoaded(tenantId);
      const all = await options.hookRuntime.repository.list(tenantId);
      const items = parsedQuery.data.entity
        ? all.filter((hook) => hook.entity === parsedQuery.data.entity)
        : all;
      return reply.send(successEnvelope({ items }));
    },
  );

  app.get(
    "/api/data-hooks/:id",
    {
      preHandler: [options.authenticate, requireHookRead],
    },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const item = await options.hookRuntime.repository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!item) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Data hook not found.",
        );
      }

      return reply.send(successEnvelope(item));
    },
  );

  app.get(
    "/api/data-hooks/:id/executions",
    {
      preHandler: [options.authenticate, requireHookRead],
    },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const parsedQuery = executionsQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid query parameters.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const hook = await options.hookRuntime.repository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!hook) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Data hook not found.",
        );
      }

      const page = await options.hookExecutionRepository.listByHookId(
        tenantId,
        parsedParams.data.id,
        {
          limit: parsedQuery.data.limit,
          cursor: decodeHookExecutionListCursor(parsedQuery.data.cursor),
        },
      );

      return reply.send(
        successEnvelope({
          items: page.items,
          nextCursor: page.nextCursor
            ? encodeHookExecutionListCursor(page.nextCursor)
            : null,
        }),
      );
    },
  );

  app.post(
    "/api/data-hooks",
    {
      preHandler: [options.authenticate, requireHookCreate],
    },
    async (request, reply) => {
      const parsedBody = createDataHookInputSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Validation failed.",
          parsedBody.error.flatten(),
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      if (parsedBody.data.tenantId && request.ctx?.isSuperAdmin !== true) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.FORBIDDEN,
          "Only superadmin may target another tenant.",
        );
      }

      try {
        const availableNames = getAvailableEntityNames(
          options.entityRuntime,
          tenantId,
        );
        const availableFormulaNames =
          await options.formulaRuntime.getAvailableFormulaNames(tenantId);
        validateCreateDataHookInput(parsedBody.data, availableNames, {
          availableFormulaNames,
        });

        const created = await options.hookRuntime.repository.create(
          tenantId,
          parsedBody.data,
        );
        await options.hookRuntime.syncHook(created);
        return reply.status(201).send(successEnvelope(created));
      } catch (error) {
        const message =
          error instanceof HookExecutionError || error instanceof Error
            ? error.message
            : "Failed to create data hook.";
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
    "/api/data-hooks/:id",
    {
      preHandler: [options.authenticate, requireHookUpdate],
    },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      const parsedBody = patchDataHookInputSchema.safeParse(request.body);
      if (!parsedParams.success || !parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const current = await options.hookRuntime.repository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Data hook not found.",
        );
      }

      try {
        const availableNames = getAvailableEntityNames(
          options.entityRuntime,
          tenantId,
        );
        const availableFormulaNames =
          await options.formulaRuntime.getAvailableFormulaNames(tenantId);
        const nextActions = parsedBody.data.actions ?? current.actions;
        validateDataHookEntity(current.entity, availableNames);
        validateDataHookActions(nextActions, availableNames, {
          availableFormulaNames,
        });

        const updated = await options.hookRuntime.repository.update(
          tenantId,
          parsedParams.data.id,
          parsedBody.data,
        );
        await options.hookRuntime.syncHook(updated);
        return reply.send(successEnvelope(updated));
      } catch (error) {
        const message =
          error instanceof HookExecutionError || error instanceof Error
            ? error.message
            : "Failed to update data hook.";
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }
    },
  );

  app.delete(
    "/api/data-hooks/:id",
    {
      preHandler: [options.authenticate, requireHookDelete],
    },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const current = await options.hookRuntime.repository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Data hook not found.",
        );
      }

      await options.hookRuntime.repository.delete(
        tenantId,
        parsedParams.data.id,
      );
      options.hookRuntime.unregister(tenantId, parsedParams.data.id);
      return reply.send(successEnvelope({ id: parsedParams.data.id }));
    },
  );

  app.put(
    "/api/data-hooks/catalog",
    {
      preHandler: [
        options.authenticate,
        requireHookCreate,
        requireHookUpdate,
        requireHookDelete,
      ],
    },
    async (request, reply) => {
      const parsedQuery = catalogQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid query parameters.",
        );
      }

      const parsedBody = validateDataHooksCatalogEnvelope(request.body);
      if (!parsedBody.ok) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Validation failed.",
          parsedBody.errors,
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      try {
        if (options.tenantIndexGuard) {
          await options.tenantIndexGuard.assertEnvironmentReady(
            tenantId,
            "catalog_replace",
          );
        }
        const result = await replaceDataHooksCatalog(
          {
            entityRuntime: options.entityRuntime,
            hookRepository: options.hookRuntime.repository,
            hookRuntime: options.hookRuntime,
            formulaRuntime: options.formulaRuntime,
          },
          tenantId,
          parsedBody.data,
          parsedQuery.data.entity ? { entity: parsedQuery.data.entity } : {},
        );
        return reply.send(
          successEnvelope({
            counts: result.counts,
            items: result.items,
          }),
        );
      } catch (error) {
        if (options.tenantIndexGuard?.mapError(reply, error)) {
          return;
        }
        const message =
          error instanceof DataHookCatalogReplaceError ||
          error instanceof HookExecutionError ||
          error instanceof Error
            ? error.message
            : "Failed to replace data hooks catalog.";
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }
    },
  );
}
