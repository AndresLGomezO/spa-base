import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import type { PushTokenRepository } from "@repo/firestore-converters";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";

interface RegisterPushTokenRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly pushTokenRepository: PushTokenRepository;
}

const upsertBodySchema = z.object({
  token: z.string().trim().min(1),
  userAgent: z.string().trim().min(1).optional(),
});

const deleteBodySchema = z.object({
  token: z.string().trim().min(1),
});

export async function registerPushTokenRoutes(
  app: FastifyInstance,
  options: RegisterPushTokenRoutesOptions,
): Promise<void> {
  app.get(
    "/api/push-tokens",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      const uid = request.ctx?.uid;
      if (!tenantId || !uid) {
        return;
      }

      const items = await options.pushTokenRepository.listForUser(
        tenantId,
        uid,
      );
      return reply.send(successEnvelope({ items }));
    },
  );

  app.put(
    "/api/push-tokens",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const parsedBody = upsertBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid push token payload.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      const uid = request.ctx?.uid;
      if (!tenantId || !uid) {
        return;
      }

      const record = await options.pushTokenRepository.upsert(tenantId, {
        userId: uid,
        token: parsedBody.data.token,
        ...(parsedBody.data.userAgent
          ? { userAgent: parsedBody.data.userAgent }
          : {}),
      });

      return reply.send(successEnvelope(record));
    },
  );

  app.delete(
    "/api/push-tokens",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const parsedBody = deleteBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid push token payload.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      const uid = request.ctx?.uid;
      if (!tenantId || !uid) {
        return;
      }

      const deleted = await options.pushTokenRepository.deleteByToken(
        tenantId,
        uid,
        parsedBody.data.token,
      );
      if (!deleted) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Push token not found.",
        );
      }

      return reply.send(successEnvelope({ deleted: true }));
    },
  );
}
