import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  decodeUserNotificationListCursor,
  encodeUserNotificationListCursor,
  type UserNotificationRepository,
} from "@repo/firestore-converters";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";

interface RegisterNotificationRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly userNotificationRepository: UserNotificationRepository;
}

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().trim().optional(),
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

const notificationIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export async function registerNotificationRoutes(
  app: FastifyInstance,
  options: RegisterNotificationRoutesOptions,
): Promise<void> {
  app.get(
    "/api/notifications",
    { preHandler: [options.authenticate] },
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
      const uid = request.ctx?.uid;
      if (!tenantId || !uid) {
        return;
      }

      const page = await options.userNotificationRepository.listForUser(
        tenantId,
        uid,
        {
          limit: parsedQuery.data.limit,
          cursor: decodeUserNotificationListCursor(parsedQuery.data.cursor),
          ...(parsedQuery.data.unreadOnly
            ? { unreadOnly: parsedQuery.data.unreadOnly }
            : {}),
        },
      );

      return reply.send(
        successEnvelope({
          items: page.items,
          nextCursor: page.nextCursor
            ? encodeUserNotificationListCursor(page.nextCursor)
            : null,
        }),
      );
    },
  );

  app.get(
    "/api/notifications/unread-count",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      const uid = request.ctx?.uid;
      if (!tenantId || !uid) {
        return;
      }

      const unreadCount =
        await options.userNotificationRepository.countUnread(tenantId, uid);

      return reply.send(successEnvelope({ unreadCount }));
    },
  );

  app.patch(
    "/api/notifications/read-all",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      const uid = request.ctx?.uid;
      if (!tenantId || !uid) {
        return;
      }

      const updatedCount =
        await options.userNotificationRepository.markAllRead(tenantId, uid);

      return reply.send(successEnvelope({ updatedCount }));
    },
  );

  app.patch(
    "/api/notifications/:id/read",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const parsedParams = notificationIdParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid notification id.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      const uid = request.ctx?.uid;
      if (!tenantId || !uid) {
        return;
      }

      const updated = await options.userNotificationRepository.markRead(
        tenantId,
        uid,
        parsedParams.data.id,
      );
      if (!updated) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Notification not found.",
        );
      }

      return reply.send(successEnvelope(updated));
    },
  );
}
