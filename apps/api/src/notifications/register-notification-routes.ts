import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  decodeUserNotificationListCursor,
  encodeUserNotificationListCursor,
  type PushTokenRepository,
  type UserNotificationRepository,
} from "@repo/firestore-converters";
import {
  createDeliverWebPushNotification,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";

interface RegisterNotificationRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly userNotificationRepository: UserNotificationRepository;
  readonly pushTokenRepository?: PushTokenRepository;
  readonly firebaseAdminConfig?: FirebaseAdminConfig;
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

const testNotificationBodySchema = z.object({
  channel: z.enum(["inApp", "push"]),
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

      const unreadCount = await options.userNotificationRepository.countUnread(
        tenantId,
        uid,
      );

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

      const updatedCount = await options.userNotificationRepository.markAllRead(
        tenantId,
        uid,
      );

      return reply.send(successEnvelope({ updatedCount }));
    },
  );

  app.post(
    "/api/notifications/test",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const parsedBody = testNotificationBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request body.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      const uid = request.ctx?.uid;
      if (!tenantId || !uid) {
        return;
      }

      const { channel } = parsedBody.data;
      const createdAt = new Date().toISOString();

      if (channel === "inApp") {
        await options.userNotificationRepository.create(tenantId, {
          userId: uid,
          message: "Test in-app notification",
          level: "info",
          createdAt,
        });
        return reply.send(successEnvelope({ channel, delivered: true }));
      }

      // channel === "push"
      if (!options.pushTokenRepository || !options.firebaseAdminConfig) {
        return replyWithError(
          reply,
          503,
          ApiErrorCode.VALIDATION_ERROR,
          "Browser push is not configured on this server.",
        );
      }

      const tokens = await options.pushTokenRepository.listForUser(
        tenantId,
        uid,
      );
      if (tokens.length === 0) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "no_push_token",
        );
      }

      try {
        const deliver = createDeliverWebPushNotification({
          config: options.firebaseAdminConfig,
          pushTokenRepository: options.pushTokenRepository,
          tenantId,
          // OS toast even when the settings tab is focused — verifies push end-to-end.
          includeNotificationPayload: true,
        });
        const result = await deliver({
          userId: uid,
          message: "Test push notification",
          level: "info",
          createdAt,
        });
        if (result.successCount === 0) {
          const detail =
            result.errors[0] ??
            "FCM did not accept the message for any registered token.";
          return replyWithError(
            reply,
            502,
            ApiErrorCode.VALIDATION_ERROR,
            detail,
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to deliver push notification.";
        return replyWithError(
          reply,
          502,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }

      return reply.send(successEnvelope({ channel, delivered: true }));
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
