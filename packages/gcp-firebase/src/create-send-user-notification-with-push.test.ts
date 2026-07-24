import { describe, expect, it, vi } from "vitest";

import { createSendUserNotificationWithPush } from "./create-send-user-notification-with-push.js";
import { createInMemoryPushTokenRepository } from "@repo/firestore-converters";
import { createInMemoryUserNotificationRepository } from "@repo/firestore-converters";

const sendEachForMulticast = vi.fn();

vi.mock("firebase-admin/messaging", () => ({
  getMessaging: () => ({ sendEachForMulticast }),
}));

vi.mock("./firebase-admin.js", () => ({
  getFirebaseAdminApp: () => ({ name: "app" }),
}));

describe("createSendUserNotificationWithPush", () => {
  it("persists notification even when FCM send fails", async () => {
    const userNotificationRepository =
      createInMemoryUserNotificationRepository();
    const pushTokenRepository = createInMemoryPushTokenRepository();
    await pushTokenRepository.upsert("tenant_a", {
      userId: "user_1",
      token: "token-a",
    });

    sendEachForMulticast.mockRejectedValue(new Error("FCM unavailable"));

    const onPushError = vi.fn();
    const send = createSendUserNotificationWithPush({
      userNotificationRepository,
      tenantId: "tenant_a",
      pushTokenRepository,
      firebaseAdminConfig: { projectId: "demo" },
      onPushError,
    });

    await expect(
      send({
        userId: "user_1",
        message: "Still saved",
        level: "info",
        createdAt: "2024-01-01T00:00:00.000Z",
      }),
    ).resolves.toBeUndefined();

    const page = await userNotificationRepository.listForUser(
      "tenant_a",
      "user_1",
    );
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.message).toBe("Still saved");
    expect(onPushError).toHaveBeenCalledOnce();
  });
});
