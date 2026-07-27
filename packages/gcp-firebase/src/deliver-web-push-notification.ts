import { getMessaging } from "firebase-admin/messaging";
import type { CreateUserNotificationInput } from "@repo/user-notifications";
import type { DeliverPushNotification } from "@repo/user-notifications";
import type { PushTokenRepository } from "@repo/firestore-converters";

import {
  getFirebaseAdminApp,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";

const FCM_MULTICAST_LIMIT = 500;

const INVALID_TOKEN_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

function isInvalidTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code =
    "code" in error && typeof error.code === "string" ? error.code : null;
  return code !== null && INVALID_TOKEN_ERROR_CODES.has(code);
}

function pushTitle(level: CreateUserNotificationInput["level"]): string {
  return level === "error" ? "Error" : "Notification";
}

export interface CreateDeliverWebPushNotificationOptions {
  readonly config: FirebaseAdminConfig;
  readonly pushTokenRepository: PushTokenRepository;
  readonly tenantId: string;
}

/**
 * Fan out a browser push to all registered FCM tokens for a user.
 * Invalid/expired tokens are pruned. Never throws to callers of the send path
 * when used behind createSendUserNotification's try/catch — but may throw on
 * unexpected messaging failures so that handler can log them.
 */
export function createDeliverWebPushNotification(
  options: CreateDeliverWebPushNotificationOptions,
): DeliverPushNotification {
  return async (input) => {
    const records = await options.pushTokenRepository.listForUser(
      options.tenantId,
      input.userId,
    );
    if (records.length === 0) {
      return;
    }

    const messaging = getMessaging(getFirebaseAdminApp(options.config));
    const title = pushTitle(input.level);
    const body = input.message;
    const data: Record<string, string> = {
      url: "/notifications",
      title,
      body,
      level: input.level,
    };

    for (
      let offset = 0;
      offset < records.length;
      offset += FCM_MULTICAST_LIMIT
    ) {
      const chunk = records.slice(offset, offset + FCM_MULTICAST_LIMIT);
      // Data-only: Chrome auto-shows an OS toast for `notification` even in a
      // focused tab, which would duplicate the client `onMessage` in-app toast.
      // The service worker and foreground handler both render from `data`.
      const response = await messaging.sendEachForMulticast({
        tokens: chunk.map((record) => record.token),
        data,
        webpush: {
          fcmOptions: { link: "/notifications" },
          headers: { Urgency: "high" },
        },
      });

      await Promise.all(
        response.responses.map(async (result, index) => {
          if (result.success || !result.error) {
            return;
          }
          if (!isInvalidTokenError(result.error)) {
            return;
          }
          const token = chunk[index]?.token;
          if (!token) {
            return;
          }
          try {
            await options.pushTokenRepository.deleteByToken(
              options.tenantId,
              input.userId,
              token,
            );
          } catch {
            // Best-effort prune; leave token for a later send if delete fails.
          }
        }),
      );
    }
  };
}
