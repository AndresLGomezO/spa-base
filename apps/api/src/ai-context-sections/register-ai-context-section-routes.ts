import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  aiContextSectionRecordSchema,
  aiContextSectionsCatalogEnvelopeSchema,
  createAiContextSectionInputSchema,
  patchAiContextSectionInputSchema,
} from "@repo/ai-context/storage";
import { invalidateUserAiMemoryCachesForTenant } from "@repo/ai-engine/grounded-chat/refresh-user-ai-memory";
import type {
  AiContextSectionRepository,
  UserAiMemoryRepository,
} from "@repo/firestore-converters";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";

interface RegisterAiContextSectionRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly aiContextSectionRepository: AiContextSectionRepository;
  readonly userAiMemoryRepository?: UserAiMemoryRepository;
}

async function invalidateCaches(
  options: RegisterAiContextSectionRoutesOptions,
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

export async function registerAiContextSectionRoutes(
  app: FastifyInstance,
  options: RegisterAiContextSectionRoutesOptions,
): Promise<void> {
  const requireRead = createRequirePermission(
    options.permissionDeps,
    "aiContextSection.read",
  );
  const requireCreate = createRequirePermission(
    options.permissionDeps,
    "aiContextSection.create",
  );
  const requireUpdate = createRequirePermission(
    options.permissionDeps,
    "aiContextSection.update",
  );
  const requireDelete = createRequirePermission(
    options.permissionDeps,
    "aiContextSection.delete",
  );

  app.get(
    "/api/ai-context-sections",
    {
      preHandler: [options.authenticate, requireRead],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const items = await options.aiContextSectionRepository.list(tenantId);
      return reply.send(successEnvelope({ items }));
    },
  );

  app.get(
    "/api/ai-context-sections/:id",
    {
      preHandler: [options.authenticate, requireRead],
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

      const item = await options.aiContextSectionRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!item) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "AI context section not found.",
        );
      }

      return reply.send(successEnvelope(item));
    },
  );

  app.post(
    "/api/ai-context-sections",
    {
      preHandler: [options.authenticate, requireCreate],
    },
    async (request, reply) => {
      const parsedBody = createAiContextSectionInputSchema.safeParse(
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
        const created = await options.aiContextSectionRepository.create(
          tenantId,
          parsedBody.data,
        );
        await invalidateCaches(options, tenantId);
        return reply.status(201).send(successEnvelope(created));
      } catch (error) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          error instanceof Error
            ? error.message
            : "Failed to create AI context section.",
        );
      }
    },
  );

  app.patch(
    "/api/ai-context-sections/:id",
    {
      preHandler: [options.authenticate, requireUpdate],
    },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      const parsedBody = patchAiContextSectionInputSchema.safeParse(
        request.body,
      );
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

      const current = await options.aiContextSectionRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "AI context section not found.",
        );
      }

      try {
        const updated = await options.aiContextSectionRepository.update(
          tenantId,
          parsedParams.data.id,
          parsedBody.data,
        );
        await invalidateCaches(options, tenantId);
        return reply.send(successEnvelope(updated));
      } catch (error) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          error instanceof Error
            ? error.message
            : "Failed to update AI context section.",
        );
      }
    },
  );

  app.delete(
    "/api/ai-context-sections/:id",
    {
      preHandler: [options.authenticate, requireDelete],
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

      const current = await options.aiContextSectionRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "AI context section not found.",
        );
      }

      await options.aiContextSectionRepository.delete(
        tenantId,
        parsedParams.data.id,
      );
      await invalidateCaches(options, tenantId);
      return reply.send(successEnvelope({ id: parsedParams.data.id }));
    },
  );

  app.put(
    "/api/ai-context-sections/catalog",
    {
      preHandler: [
        options.authenticate,
        requireCreate,
        requireUpdate,
        requireDelete,
      ],
    },
    async (request, reply) => {
      const parsedBody = aiContextSectionsCatalogEnvelopeSchema.safeParse(
        request.body,
      );
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid catalog envelope.",
          parsedBody.error.flatten(),
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const items = parsedBody.data.items.map((item) =>
        aiContextSectionRecordSchema.parse({
          ...item,
          tenantId,
        }),
      );

      const replaced = await options.aiContextSectionRepository.replaceAll(
        tenantId,
        items,
      );
      await invalidateCaches(options, tenantId);
      return reply.send(successEnvelope({ items: replaced }));
    },
  );
}
