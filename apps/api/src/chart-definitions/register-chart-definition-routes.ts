import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  createChartDefinitionInputSchema,
  patchChartDefinitionInputSchema,
  validateChartDefinitionsCatalogEnvelope,
} from "@repo/chart-definitions";
import type { ChartDefinitionRepository } from "@repo/firestore-converters";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import { assertCanReadChartDefinition } from "./assert-chart-definition-access.js";
import {
  ChartCatalogReplaceError,
  replaceChartDefinitionsCatalog,
} from "./replace-chart-definitions-catalog.js";

interface RegisterChartDefinitionRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly chartDefinitionRepository: ChartDefinitionRepository;
}

const tenantIdQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
});

export async function registerChartDefinitionRoutes(
  app: FastifyInstance,
  options: RegisterChartDefinitionRoutesOptions,
): Promise<void> {
  const requireRead = createRequirePermission(
    options.permissionDeps,
    "chartDefinition.read",
  );
  const requireCreate = createRequirePermission(
    options.permissionDeps,
    "chartDefinition.create",
  );
  const requireUpdate = createRequirePermission(
    options.permissionDeps,
    "chartDefinition.update",
  );
  const requireDelete = createRequirePermission(
    options.permissionDeps,
    "chartDefinition.delete",
  );

  app.get(
    "/api/chart-definitions",
    { preHandler: [options.authenticate, requireRead] },
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

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const items = await options.chartDefinitionRepository.list(tenantId);
      return reply.send(successEnvelope({ items }));
    },
  );

  app.get(
    "/api/chart-definitions/:id",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const item = await options.chartDefinitionRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!item) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Chart definition not found.",
        );
      }

      if (
        !(await assertCanReadChartDefinition(
          request,
          reply,
          options.permissionDeps,
        ))
      ) {
        return;
      }

      return reply.send(successEnvelope(item));
    },
  );

  app.post(
    "/api/chart-definitions",
    { preHandler: [options.authenticate, requireCreate] },
    async (request, reply) => {
      const parsedBody = createChartDefinitionInputSchema.safeParse(
        request.body,
      );
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

      try {
        const created = await options.chartDefinitionRepository.create(
          tenantId,
          parsedBody.data,
        );
        return reply.status(201).send(successEnvelope(created));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create chart definition.";
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
    "/api/chart-definitions/:id",
    { preHandler: [options.authenticate, requireUpdate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      const parsedBody = patchChartDefinitionInputSchema.safeParse(
        request.body,
      );
      if (!parsedParams.success || !parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
          parsedBody.success ? undefined : parsedBody.error.flatten(),
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const current = await options.chartDefinitionRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Chart definition not found.",
        );
      }

      try {
        const updated = await options.chartDefinitionRepository.update(
          tenantId,
          parsedParams.data.id,
          parsedBody.data,
        );
        return reply.send(successEnvelope(updated));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update chart definition.";
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
    "/api/chart-definitions/:id",
    { preHandler: [options.authenticate, requireDelete] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const current = await options.chartDefinitionRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Chart definition not found.",
        );
      }

      await options.chartDefinitionRepository.delete(
        tenantId,
        parsedParams.data.id,
      );
      return reply.send(successEnvelope({ ok: true }));
    },
  );

  app.put(
    "/api/chart-definitions/catalog",
    {
      preHandler: [
        options.authenticate,
        requireCreate,
        requireUpdate,
        requireDelete,
      ],
    },
    async (request, reply) => {
      const parsedBody = validateChartDefinitionsCatalogEnvelope(request.body);
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
        const result = await replaceChartDefinitionsCatalog(
          {
            chartDefinitionRepository: options.chartDefinitionRepository,
          },
          tenantId,
          parsedBody.data,
        );
        return reply.send(
          successEnvelope({
            counts: result.counts,
            items: result.items,
          }),
        );
      } catch (error) {
        const message =
          error instanceof ChartCatalogReplaceError || error instanceof Error
            ? error.message
            : "Failed to replace chart catalog.";
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
