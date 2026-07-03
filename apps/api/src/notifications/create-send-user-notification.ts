import type { CreateUserNotificationInput } from "@repo/firestore-converters";
import type { UserNotificationRepository } from "@repo/firestore-converters";

export function createSendUserNotification(
  repository: UserNotificationRepository,
  tenantId: string,
): (input: CreateUserNotificationInput) => Promise<void> {
  return async (input) => {
    await repository.create(tenantId, input);
  };
}
