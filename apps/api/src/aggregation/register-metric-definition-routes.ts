import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  createMetricDefinitionInputSchema,
  patchMetricDefinitionInputSchema,
} from "@repo/metrics-engine";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import { assertCanReadMetricDefinition } from "./assert-metric-access.js";
import { runMetricBackfill } from "./run-backfill.js";
import type { MetricRuntimeContext } from "./metric-runtime-context.js";
import {
  findEntityForSourceModel,
  validateMetricDefinitionDateGranularity,
} from "./validate-metric-definition-entity.js";

interface RegisterMetricDefinitionRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
  readonly metricRuntime: MetricRuntimeContext;
}

const tenantIdQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
});

const backfillBodySchema = z.object({
  previousVersion: z.number().int().nonnegative().optional(),
  changedDefinitionFields: z.array(z.string().trim().min(1)).optional(),
});

function getAvailableEntityNames(
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
): readonly string[] {
  return entityRuntime
    .getEntitiesForTenant(tenantId)
    .map((entity) => entity.name);
}

export async function registerMetricDefinitionRoutes(
  app: FastifyInstance,
  options: RegisterMetricDefinitionRoutesOptions,
): Promise<void> {
  const requireRead = createRequirePermission(
    options.permissionDeps,
    "metricDefinition.read",
  );
  const requireCreate = createRequirePermission(
    options.permissionDeps,
    "metricDefinition.create",
  );
  const requireUpdate = createRequirePermission(
    options.permissionDeps,
    "metricDefinition.update",
  );
  const requireDelete = createRequirePermission(
    options.permissionDeps,
    "metricDefinition.delete",
  );
  const requireBackfill = createRequirePermission(
    options.permissionDeps,
    "metricDefinition.backfill",
  );

  app.get(
    "/api/metric-definitions",
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

      const items =
        await options.metricRuntime.metricDefinitionRepository.list(tenantId);
      return reply.send(successEnvelope({ items }));
    },
  );

  app.get(
    "/api/metric-definitions/:id",
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

      const item =
        await options.metricRuntime.metricDefinitionRepository.getById(
          tenantId,
          parsedParams.data.id,
        );
      if (!item) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Metric definition not found.",
        );
      }

      if (
        !(await assertCanReadMetricDefinition(
          request,
          reply,
          options.permissionDeps,
          item.sourceModel,
        ))
      ) {
        return;
      }

      return reply.send(successEnvelope(item));
    },
  );

  app.post(
    "/api/metric-definitions",
    { preHandler: [options.authenticate, requireCreate] },
    async (request, reply) => {
      const parsedBody = createMetricDefinitionInputSchema.safeParse(
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

      const availableNames = getAvailableEntityNames(
        options.entityRuntime,
        tenantId,
      );
      if (!availableNames.includes(parsedBody.data.sourceModel)) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          `Unknown source model "${parsedBody.data.sourceModel}".`,
        );
      }

      const sourceEntity = findEntityForSourceModel(
        options.entityRuntime.getEntitiesForTenant(tenantId),
        parsedBody.data.sourceModel,
      );
      if (sourceEntity) {
        const dateGranularityError = validateMetricDefinitionDateGranularity(
          sourceEntity,
          {
            groupBy: parsedBody.data.groupBy,
            dimensions: parsedBody.data.dimensions,
            dateFieldGranularity: parsedBody.data.dateFieldGranularity,
          },
        );
        if (dateGranularityError) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            dateGranularityError,
          );
        }
      }

      try {
        const created =
          await options.metricRuntime.metricDefinitionRepository.create(
            tenantId,
            parsedBody.data,
          );
        options.metricRuntime.invalidateTenantMetrics(tenantId);
        return reply.status(201).send(successEnvelope(created));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create metric definition.";
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
    "/api/metric-definitions/:id",
    { preHandler: [options.authenticate, requireUpdate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      const parsedBody = patchMetricDefinitionInputSchema.safeParse(
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

      const current =
        await options.metricRuntime.metricDefinitionRepository.getById(
          tenantId,
          parsedParams.data.id,
        );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Metric definition not found.",
        );
      }

      const sourceEntity = findEntityForSourceModel(
        options.entityRuntime.getEntitiesForTenant(tenantId),
        current.sourceModel,
      );
      if (sourceEntity) {
        const dateGranularityError = validateMetricDefinitionDateGranularity(
          sourceEntity,
          {
            groupBy: parsedBody.data.groupBy ?? current.groupBy,
            dimensions: parsedBody.data.dimensions ?? current.dimensions,
            dateFieldGranularity:
              parsedBody.data.dateFieldGranularity ??
              current.dateFieldGranularity,
          },
        );
        if (dateGranularityError) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            dateGranularityError,
          );
        }
      }

      try {
        const updated =
          await options.metricRuntime.metricDefinitionRepository.update(
            tenantId,
            parsedParams.data.id,
            parsedBody.data,
          );
        options.metricRuntime.invalidateTenantMetrics(tenantId);
        return reply.send(successEnvelope(updated));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update metric definition.";
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
    "/api/metric-definitions/:id",
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

      const current =
        await options.metricRuntime.metricDefinitionRepository.getById(
          tenantId,
          parsedParams.data.id,
        );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Metric definition not found.",
        );
      }

      await options.metricRuntime.metricDefinitionRepository.delete(
        tenantId,
        parsedParams.data.id,
      );
      options.metricRuntime.invalidateTenantMetrics(tenantId);
      return reply.send(successEnvelope({ deleted: true }));
    },
  );

  app.post(
    "/api/metric-definitions/:id/backfill",
    { preHandler: [options.authenticate, requireBackfill] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      const parsedBody = backfillBodySchema.safeParse(request.body ?? {});
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

      try {
        const result = await runMetricBackfill(
          options.metricRuntime,
          tenantId,
          parsedParams.data.id,
          parsedBody.data.previousVersion !== undefined
            ? {
                previousVersion: parsedBody.data.previousVersion,
                changedDefinitionFields:
                  parsedBody.data.changedDefinitionFields ?? [],
              }
            : undefined,
        );
        return reply.send(successEnvelope(result));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Backfill failed.";
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
