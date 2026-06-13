import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import { designLayoutSurfaceSchema } from "@repo/ai-engine/schemas";
import type { UiBuilderAiSuggestionRepository } from "@repo/firestore-converters";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";

interface RegisterUiBuilderAiSuggestionRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly uiBuilderAiSuggestionRepository: UiBuilderAiSuggestionRepository;
}

const listQuerySchema = z.object({
  surface: designLayoutSurfaceSchema.default("list"),
});

export async function registerUiBuilderAiSuggestionRoutes(
  app: FastifyInstance,
  options: RegisterUiBuilderAiSuggestionRoutesOptions,
): Promise<void> {
  const requireAiUiBuilderRead = createRequirePermission(
    options.permissionDeps,
    "ai.uiBuilder.read",
  );

  app.get(
    "/api/entities/:entityName/ui-builder/ai-suggestions",
    {
      preHandler: [options.authenticate, requireAiUiBuilderRead],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const entityName = (
        request.params as { entityName?: string }
      ).entityName?.trim();
      if (!entityName) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Entity name is required.",
        );
      }

      const parsedQuery = listQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid query parameters.",
          parsedQuery.error.flatten(),
        );
      }

      const suggestions =
        await options.uiBuilderAiSuggestionRepository.listByEntityAndSurface(
          tenantId,
          entityName,
          parsedQuery.data.surface,
        );

      return reply.send(successEnvelope({ suggestions }));
    },
  );

  app.get(
    "/api/entities/:entityName/ui-builder/ai-suggestions/:suggestionId",
    {
      preHandler: [options.authenticate, requireAiUiBuilderRead],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const entityName = (
        request.params as { entityName?: string }
      ).entityName?.trim();
      const suggestionId = (
        request.params as { suggestionId?: string }
      ).suggestionId?.trim();

      if (!entityName || !suggestionId) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Entity name and suggestion id are required.",
        );
      }

      const suggestion = await options.uiBuilderAiSuggestionRepository.getById(
        tenantId,
        suggestionId,
      );
      if (!suggestion || suggestion.entityName !== entityName) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "AI suggestion not found.",
        );
      }

      return reply.send(successEnvelope({ suggestion }));
    },
  );
}
