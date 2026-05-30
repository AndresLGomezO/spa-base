import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  createHookInputSchema,
  HookExecutionError,
  patchHookInputSchema,
  validateHookActions,
  validateHookEntityAndEvent,
} from "@repo/hooks";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireTargetTenant } from "../auth/resolve-target-tenant-id.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { HookRuntimeContext } from "./hook-runtime-context.js";

interface RegisterHookRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
  readonly hookRuntime: HookRuntimeContext;
}

const tenantIdQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
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

  app.get(
    "/api/hooks",
    {
      preHandler: [options.authenticate, requireHookRead],
    },
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

      await options.hookRuntime.ensureTenantHooksLoaded(tenantId);
      const items = await options.hookRuntime.repository.list(tenantId);
      return reply.send(successEnvelope({ items }));
    },
  );

  app.get(
    "/api/hooks/:id",
    {
      preHandler: [options.authenticate, requireHookRead],
    },
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

      const item = await options.hookRuntime.repository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!item) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Hook not found.",
        );
      }

      return reply.send(successEnvelope(item));
    },
  );

  app.post(
    "/api/hooks",
    {
      preHandler: [options.authenticate, requireHookCreate],
    },
    async (request, reply) => {
      const parsedBody = createHookInputSchema.safeParse(request.body);
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

      try {
        const availableNames = getAvailableEntityNames(
          options.entityRuntime,
          tenantId,
        );
        validateHookEntityAndEvent(
          parsedBody.data.entity,
          parsedBody.data.event,
          availableNames,
        );
        validateHookActions(parsedBody.data.config.actions, availableNames);

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
            : "Failed to create hook.";
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
    "/api/hooks/:id",
    {
      preHandler: [options.authenticate, requireHookUpdate],
    },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      const parsedBody = patchHookInputSchema.safeParse(request.body);
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

      const current = await options.hookRuntime.repository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Hook not found.",
        );
      }

      try {
        const availableNames = getAvailableEntityNames(
          options.entityRuntime,
          tenantId,
        );
        const nextConfig = parsedBody.data.config ?? current.config;
        validateHookActions(nextConfig.actions, availableNames);

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
            : "Failed to update hook.";
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
