import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  aiRecordSummaryTemplateSchema,
  deleteAiRecordSummaryTemplate,
  getAiRecordSummaryTemplate,
  listAiRecordSummaryTemplates,
  upsertAiRecordSummaryTemplate,
} from "@repo/ai-context";
import { invalidateUserAiMemoryCachesForTenant } from "@repo/ai-engine/grounded-chat/refresh-user-ai-memory";
import type {
  EntityDefinitionRepository,
  TenantAiContextRepository,
  UserAiMemoryRepository,
} from "@repo/firestore-converters";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";

interface RegisterAiRecordSummaryTemplateRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly tenantAiContextRepository: TenantAiContextRepository;
  readonly entityDefinitionRepository: EntityDefinitionRepository;
  readonly userAiMemoryRepository?: UserAiMemoryRepository;
}

async function invalidateCaches(
  options: RegisterAiRecordSummaryTemplateRoutesOptions,
  tenantId: string,
): Promise<void> {
  if (!options.userAiMemoryRepository) {
    return;
  }
  await invalidateUserAiMemoryCachesForTenant(
    options.userAiMemoryRepository,
    tenantId,
  );
}

const entityNameParamsSchema = z.object({
  entityName: z.string().trim().min(1),
});

export async function registerAiRecordSummaryTemplateRoutes(
  app: FastifyInstance,
  options: RegisterAiRecordSummaryTemplateRoutesOptions,
): Promise<void> {
  const requireRead = createRequirePermission(
    options.permissionDeps,
    "aiRecordSummaryTemplate.read",
  );
  const requireUpdate = createRequirePermission(
    options.permissionDeps,
    "aiRecordSummaryTemplate.update",
  );
  const requireDelete = createRequirePermission(
    options.permissionDeps,
    "aiRecordSummaryTemplate.delete",
  );

  app.get(
    "/api/ai-record-summary-templates",
    {
      preHandler: [options.authenticate, requireRead],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const definitions =
        await options.entityDefinitionRepository.list(tenantId);
      const entityNames = definitions.map((d) => d.name);
      const items = await listAiRecordSummaryTemplates(
        options.tenantAiContextRepository,
        tenantId,
        entityNames,
      );
      return reply.send(successEnvelope({ items }));
    },
  );

  app.get(
    "/api/ai-record-summary-templates/:entityName",
    {
      preHandler: [options.authenticate, requireRead],
    },
    async (request, reply) => {
      const parsedParams = entityNameParamsSchema.safeParse(request.params);
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

      const template = await getAiRecordSummaryTemplate(
        options.tenantAiContextRepository,
        tenantId,
        parsedParams.data.entityName,
      );
      if (!template) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "AI record summary template not found.",
        );
      }

      return reply.send(
        successEnvelope({
          entityName: parsedParams.data.entityName,
          template,
        }),
      );
    },
  );

  app.put(
    "/api/ai-record-summary-templates/:entityName",
    {
      preHandler: [options.authenticate, requireUpdate],
    },
    async (request, reply) => {
      const parsedParams = entityNameParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const parsedBody = aiRecordSummaryTemplateSchema.safeParse(request.body);
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

      const template = await upsertAiRecordSummaryTemplate(
        options.tenantAiContextRepository,
        tenantId,
        parsedParams.data.entityName,
        parsedBody.data,
      );
      await invalidateCaches(options, tenantId);

      return reply.send(
        successEnvelope({
          entityName: parsedParams.data.entityName,
          template,
        }),
      );
    },
  );

  app.delete(
    "/api/ai-record-summary-templates/:entityName",
    {
      preHandler: [options.authenticate, requireDelete],
    },
    async (request, reply) => {
      const parsedParams = entityNameParamsSchema.safeParse(request.params);
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

      const deleted = await deleteAiRecordSummaryTemplate(
        options.tenantAiContextRepository,
        tenantId,
        parsedParams.data.entityName,
      );
      if (!deleted) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "AI record summary template not found.",
        );
      }
      await invalidateCaches(options, tenantId);
      return reply.status(204).send();
    },
  );
}
