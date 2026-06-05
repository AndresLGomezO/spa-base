import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  createUiBuilderPresetInputSchema,
  ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  updateUiBuilderPresetInputSchema,
} from "@repo/entities";
import type { UiBuilderPresetRepository } from "@repo/firestore-converters";

import { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { createRequireAnyPermission } from "../rbac/create-require-any-permission.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";

interface RegisterUiBuilderPresetRoutesOptions {
  readonly authenticate: ReturnType<typeof createAuthenticatePreHandler>;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly uiBuilderPresetRepository: UiBuilderPresetRepository;
}

const presetIdParamSchema = z.object({
  presetId: z.string().trim().min(1),
});

function formatZodValidationMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) {
    return "Invalid preset payload.";
  }
  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

export async function registerUiBuilderPresetRoutes(
  app: FastifyInstance,
  options: RegisterUiBuilderPresetRoutesOptions,
): Promise<void> {
  const requirePresetRead = createRequirePermission(
    options.permissionDeps,
    "entityUiOverride.read",
  );
  const requirePresetWrite = createRequireAnyPermission(
    options.permissionDeps,
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );

  app.get(
    "/api/ui-builder-presets",
    {
      preHandler: [
        options.authenticate,
        requirePresetRead as preHandlerAsyncHookHandler,
      ],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) {
        return;
      }

      const items = await options.uiBuilderPresetRepository.list(tenantId);
      return reply.send(successEnvelope({ items }));
    },
  );

  app.get(
    "/api/ui-builder-presets/:presetId",
    {
      preHandler: [
        options.authenticate,
        requirePresetRead as preHandlerAsyncHookHandler,
      ],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) {
        return;
      }

      const params = presetIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid preset id.",
        );
      }

      const preset = await options.uiBuilderPresetRepository.get(
        tenantId,
        params.data.presetId,
      );
      if (!preset) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Preset not found.",
        );
      }

      return reply.send(successEnvelope({ preset }));
    },
  );

  app.post(
    "/api/ui-builder-presets",
    {
      preHandler: [
        options.authenticate,
        requirePresetWrite as preHandlerAsyncHookHandler,
      ],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) {
        return;
      }

      const parsed = createUiBuilderPresetInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          formatZodValidationMessage(parsed.error),
        );
      }

      try {
        const preset = await options.uiBuilderPresetRepository.create(
          tenantId,
          parsed.data,
        );
        return reply.send(successEnvelope({ preset }));
      } catch (error) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          error instanceof Error ? error.message : "Invalid preset payload.",
        );
      }
    },
  );

  app.put(
    "/api/ui-builder-presets/:presetId",
    {
      preHandler: [
        options.authenticate,
        requirePresetWrite as preHandlerAsyncHookHandler,
      ],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) {
        return;
      }

      const params = presetIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid preset id.",
        );
      }

      const parsed = updateUiBuilderPresetInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          formatZodValidationMessage(parsed.error),
        );
      }

      try {
        const preset = await options.uiBuilderPresetRepository.update(
          tenantId,
          params.data.presetId,
          parsed.data,
        );
        return reply.send(successEnvelope({ preset }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to update preset.";
        const status = message === "Preset not found." ? 404 : 400;
        return replyWithError(
          reply,
          status,
          status === 404
            ? ApiErrorCode.NOT_FOUND
            : ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }
    },
  );

  app.delete(
    "/api/ui-builder-presets/:presetId",
    {
      preHandler: [
        options.authenticate,
        requirePresetWrite as preHandlerAsyncHookHandler,
      ],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) {
        return;
      }

      const params = presetIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid preset id.",
        );
      }

      const existing = await options.uiBuilderPresetRepository.get(
        tenantId,
        params.data.presetId,
      );
      if (!existing) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Preset not found.",
        );
      }

      await options.uiBuilderPresetRepository.delete(
        tenantId,
        params.data.presetId,
      );
      return reply.send(successEnvelope({ deleted: true }));
    },
  );
}
