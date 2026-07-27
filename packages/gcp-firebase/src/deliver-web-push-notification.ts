import { getMessaging } from "firebase-admin/messaging";
import type { CreateUserNotificationInput } from "@repo/user-notifications";
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

function formatFcmError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Unknown FCM error";
  }
  const code =
    "code" in error && typeof error.code === "string" ? error.code : null;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : null;
  if (code && message) {
    return `${code}: ${message}`;
  }
  return code ?? message ?? "Unknown FCM error";
}

export interface CreateDeliverWebPushNotificationOptions {
  readonly config: FirebaseAdminConfig;
  readonly pushTokenRepository: PushTokenRepository;
  readonly tenantId: string;
  /**
   * When true, include FCM `notification` so browsers always show an OS toast
   * (useful for explicit test sends). Default false = data-only for in-app
   * foreground control.
   */
  readonly includeNotificationPayload?: boolean;
}

export interface DeliverWebPushResult {
  readonly successCount: number;
  readonly failureCount: number;
  readonly errors: readonly string[];
}

/**
 * Fan out a browser push to all registered FCM tokens for a user.
 * Invalid/expired tokens are pruned. Returns per-send success/failure counts
 * (does not throw on partial FCM failures).
 */
export function createDeliverWebPushNotification(
  options: CreateDeliverWebPushNotificationOptions,
): (input: CreateUserNotificationInput) => Promise<DeliverWebPushResult> {
  return async (input) => {
    const records = await options.pushTokenRepository.listForUser(
      options.tenantId,
      input.userId,
    );
    if (records.length === 0) {
      return { successCount: 0, failureCount: 0, errors: [] };
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

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (
      let offset = 0;
      offset < records.length;
      offset += FCM_MULTICAST_LIMIT
    ) {
      const chunk = records.slice(offset, offset + FCM_MULTICAST_LIMIT);
      // Default data-only: Chrome auto-shows an OS toast for `notification`
      // even in a focused tab, which would duplicate the client `onMessage`
      // in-app toast. Test sends may opt into `notification` for visibility.
      const response = await messaging.sendEachForMulticast({
        tokens: chunk.map((record) => record.token),
        ...(options.includeNotificationPayload
          ? { notification: { title, body } }
          : {}),
        data,
        webpush: {
          fcmOptions: { link: "/notifications" },
          headers: { Urgency: "high" },
        },
      });

      await Promise.all(
        response.responses.map(async (result, index) => {
          if (result.success) {
            successCount += 1;
            return;
          }
          failureCount += 1;
          if (result.error) {
            errors.push(formatFcmError(result.error));
          }
          if (!result.error || !isInvalidTokenError(result.error)) {
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

    return { successCount, failureCount, errors };
  };
}
