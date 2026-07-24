import type { CreateUserNotificationInput } from "./user-notification.js";

export interface UserNotificationCreateRepository {
  create(
    tenantId: string,
    input: CreateUserNotificationInput,
  ): Promise<unknown>;
}

export type DeliverPushNotification = (
  input: CreateUserNotificationInput,
) => Promise<void>;

export interface CreateSendUserNotificationOptions {
  readonly deliverPush?: DeliverPushNotification;
  readonly onPushError?: (
    error: unknown,
    input: CreateUserNotificationInput,
  ) => void;
}

/**
 * Persist an in-app notification, then best-effort deliver a browser push.
 * Push failures never reject — in-app history remains the source of truth.
 */
export function createSendUserNotification(
  repository: UserNotificationCreateRepository,
  tenantId: string,
  options?: CreateSendUserNotificationOptions,
): (input: CreateUserNotificationInput) => Promise<void> {
  return async (input) => {
    await repository.create(tenantId, input);
    if (!options?.deliverPush) {
      return;
    }
    try {
      await options.deliverPush(input);
    } catch (error) {
      options.onPushError?.(error, input);
    }
  };
}
