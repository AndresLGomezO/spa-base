import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEachForMulticast = vi.fn();
const getMessaging = vi.fn(() => ({ sendEachForMulticast }));
const getFirebaseAdminApp = vi.fn(() => ({ name: "app" }));

vi.mock("firebase-admin/messaging", () => ({
  getMessaging: () => getMessaging(),
}));

vi.mock("./firebase-admin.js", () => ({
  getFirebaseAdminApp: () => getFirebaseAdminApp(),
}));

import { createDeliverWebPushNotification } from "./deliver-web-push-notification.js";
import { createInMemoryPushTokenRepository } from "@repo/firestore-converters";

describe("createDeliverWebPushNotification", () => {
  beforeEach(() => {
    sendEachForMulticast.mockReset();
    getMessaging.mockClear();
    getFirebaseAdminApp.mockClear();
  });

  it("no-ops when the user has no tokens", async () => {
    const pushTokenRepository = createInMemoryPushTokenRepository();
    const deliver = createDeliverWebPushNotification({
      config: { projectId: "demo" },
      pushTokenRepository,
      tenantId: "tenant_a",
    });

    await deliver({
      userId: "user_1",
      message: "Hello",
      level: "info",
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it("sends to all registered tokens for the user", async () => {
    const pushTokenRepository = createInMemoryPushTokenRepository();
    await pushTokenRepository.upsert("tenant_a", {
      userId: "user_1",
      token: "token-a",
    });
    await pushTokenRepository.upsert("tenant_a", {
      userId: "user_1",
      token: "token-b",
    });
    await pushTokenRepository.upsert("tenant_a", {
      userId: "user_other",
      token: "token-other",
    });

    sendEachForMulticast.mockResolvedValue({
      responses: [{ success: true }, { success: true }],
    });

    const deliver = createDeliverWebPushNotification({
      config: { projectId: "demo" },
      pushTokenRepository,
      tenantId: "tenant_a",
    });

    await deliver({
      userId: "user_1",
      message: "Payment due",
      level: "info",
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    expect(sendEachForMulticast).toHaveBeenCalledOnce();
    const payload = sendEachForMulticast.mock.calls[0]?.[0];
    expect(payload.tokens).toHaveLength(2);
    expect(payload.tokens).toEqual(
      expect.arrayContaining(["token-a", "token-b"]),
    );
    expect(payload.notification).toEqual({
      title: "Notification",
      body: "Payment due",
    });
    expect(payload.data.url).toBe("/notifications");
  });

  it("prunes invalid tokens without failing the send", async () => {
    const pushTokenRepository = createInMemoryPushTokenRepository();
    await pushTokenRepository.upsert("tenant_a", {
      userId: "user_1",
      token: "token-good",
    });
    await pushTokenRepository.upsert("tenant_a", {
      userId: "user_1",
      token: "token-bad",
    });

    sendEachForMulticast.mockResolvedValue({
      responses: [
        { success: true },
        {
          success: false,
          error: { code: "messaging/registration-token-not-registered" },
        },
      ],
    });

    const deliver = createDeliverWebPushNotification({
      config: { projectId: "demo" },
      pushTokenRepository,
      tenantId: "tenant_a",
    });

    await deliver({
      userId: "user_1",
      message: "Hello",
      level: "error",
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    const remaining = await pushTokenRepository.listForUser(
      "tenant_a",
      "user_1",
    );
    expect(remaining.map((record) => record.token)).toEqual(["token-good"]);
  });
});
