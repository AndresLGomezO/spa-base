import {
  createSendUserNotification,
  type CreateUserNotificationInput,
} from "@repo/user-notifications";
import type {
  PushTokenRepository,
  UserNotificationRepository,
} from "@repo/firestore-converters";

import type { FirebaseAdminConfig } from "./firebase-admin.js";
import { createDeliverWebPushNotification } from "./deliver-web-push-notification.js";

export interface CreateSendUserNotificationWithPushOptions {
  readonly userNotificationRepository: UserNotificationRepository;
  readonly tenantId: string;
  readonly pushTokenRepository?: PushTokenRepository;
  readonly firebaseAdminConfig?: FirebaseAdminConfig;
  readonly onPushError?: (
    error: unknown,
    input: CreateUserNotificationInput,
  ) => void;
}

/**
 * Persist in-app notification and best-effort fan-out to FCM when a token
 * store + Firebase admin config are provided.
 */
export function createSendUserNotificationWithPush(
  options: CreateSendUserNotificationWithPushOptions,
): (input: CreateUserNotificationInput) => Promise<void> {
  const canPush =
    options.pushTokenRepository !== undefined &&
    options.firebaseAdminConfig !== undefined;

  return createSendUserNotification(
    options.userNotificationRepository,
    options.tenantId,
    canPush
      ? {
          deliverPush: async (input) => {
            await createDeliverWebPushNotification({
              config: options.firebaseAdminConfig!,
              pushTokenRepository: options.pushTokenRepository!,
              tenantId: options.tenantId,
            })(input);
          },
          ...(options.onPushError ? { onPushError: options.onPushError } : {}),
        }
      : undefined,
  );
}
