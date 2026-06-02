import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  buildMetricDocId,
  mergeAvgFieldsIntoValues,
  metricBatchQuerySchema,
  metricRowQuerySchema,
  MetricQueryValidationError,
  validateMetricQueryAgainstDefinition,
} from "@repo/metrics-engine";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { MetricRuntimeContext } from "./metric-runtime-context.js";

interface RegisterMetricReadRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly metricRuntime: MetricRuntimeContext;
}

const metricDefinitionIdParamsSchema = z.object({
  metricDefinitionId: z.string().trim().min(1),
});

function formatMetricRowResponse(record: {
  readonly values: Record<string, number>;
  readonly updatedAt: string;
}): { readonly values: Record<string, number>; readonly updatedAt: string } {
  return {
    values: mergeAvgFieldsIntoValues(record.values),
    updatedAt: record.updatedAt,
  };
}

export async function registerMetricReadRoutes(
  app: FastifyInstance,
  options: RegisterMetricReadRoutesOptions,
): Promise<void> {
  const requireMetricValueRead = createRequirePermission(
    options.permissionDeps,
    "metricValue.read",
  );

  app.post(
    "/api/metrics/:metricDefinitionId/row",
    { preHandler: [options.authenticate, requireMetricValueRead] },
    async (request, reply) => {
      const parsedParams = metricDefinitionIdParamsSchema.safeParse(
        request.params,
      );
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
        );
      }

      const parsedBody = metricRowQuerySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request body.",
          parsedBody.error.flatten(),
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const userId = request.ctx?.uid?.trim();
      if (!userId) {
        return replyWithError(
          reply,
          401,
          ApiErrorCode.UNAUTHORIZED,
          "Authentication required.",
        );
      }

      const definition =
        await options.metricRuntime.metricDefinitionRepository.getById(
          tenantId,
          parsedParams.data.metricDefinitionId,
        );
      if (!definition) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Metric definition not found.",
        );
      }

      let normalizedQuery: {
        readonly group: Record<string, unknown>;
        readonly dimensions: Record<string, unknown>;
      };
      try {
        normalizedQuery = validateMetricQueryAgainstDefinition(
          definition,
          parsedBody.data,
        );
      } catch (error) {
        if (error instanceof MetricQueryValidationError) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            error.message,
          );
        }
        throw error;
      }

      const docId = buildMetricDocId(
        userId,
        normalizedQuery.group,
        normalizedQuery.dimensions,
      );
      const record = await options.metricRuntime.metricValueRepository.getById(
        tenantId,
        definition.target.collection,
        docId,
      );

      if (!record) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.METRIC_ROW_NOT_FOUND,
          "Metric row not found.",
        );
      }

      return reply.send(successEnvelope(formatMetricRowResponse(record)));
    },
  );

  app.post(
    "/api/metrics/:metricDefinitionId/batch",
    { preHandler: [options.authenticate, requireMetricValueRead] },
    async (request, reply) => {
      const parsedParams = metricDefinitionIdParamsSchema.safeParse(
        request.params,
      );
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
        );
      }

      const parsedBody = metricBatchQuerySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request body.",
          parsedBody.error.flatten(),
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const userId = request.ctx?.uid?.trim();
      if (!userId) {
        return replyWithError(
          reply,
          401,
          ApiErrorCode.UNAUTHORIZED,
          "Authentication required.",
        );
      }

      const definition =
        await options.metricRuntime.metricDefinitionRepository.getById(
          tenantId,
          parsedParams.data.metricDefinitionId,
        );
      if (!definition) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Metric definition not found.",
        );
      }

      const docIds: string[] = [];
      for (const query of parsedBody.data.queries) {
        try {
          const normalized = validateMetricQueryAgainstDefinition(
            definition,
            query,
          );
          docIds.push(
            buildMetricDocId(userId, normalized.group, normalized.dimensions),
          );
        } catch (error) {
          if (error instanceof MetricQueryValidationError) {
            return replyWithError(
              reply,
              400,
              ApiErrorCode.VALIDATION_ERROR,
              error.message,
            );
          }
          throw error;
        }
      }

      const records =
        await options.metricRuntime.metricValueRepository.getManyByIds(
          tenantId,
          definition.target.collection,
          docIds,
        );

      const items = records.map((record) =>
        record ? formatMetricRowResponse(record) : null,
      );

      return reply.send(successEnvelope({ items }));
    },
  );
}
