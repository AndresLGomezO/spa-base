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
    expect(payload.notification).toBeUndefined();
    expect(payload.data).toEqual({
      url: "/notifications",
      title: "Notification",
      body: "Payment due",
      level: "info",
    });
    expect(payload.webpush).toEqual({
      fcmOptions: { link: "/notifications" },
      headers: { Urgency: "high" },
    });
  });

  it("includes notification payload when requested", async () => {
    const pushTokenRepository = createInMemoryPushTokenRepository();
    await pushTokenRepository.upsert("tenant_a", {
      userId: "user_1",
      token: "token-a",
    });

    sendEachForMulticast.mockResolvedValue({
      responses: [{ success: true }],
      successCount: 1,
      failureCount: 0,
    });

    const deliver = createDeliverWebPushNotification({
      config: { projectId: "demo" },
      pushTokenRepository,
      tenantId: "tenant_a",
      includeNotificationPayload: true,
    });

    const result = await deliver({
      userId: "user_1",
      message: "Test push",
      level: "info",
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    expect(result).toEqual({
      successCount: 1,
      failureCount: 0,
      errors: [],
    });
    expect(sendEachForMulticast.mock.calls[0]?.[0].notification).toEqual({
      title: "Notification",
      body: "Test push",
    });
  });

  it("reports FCM failures without throwing", async () => {
    const pushTokenRepository = createInMemoryPushTokenRepository();
    await pushTokenRepository.upsert("tenant_a", {
      userId: "user_1",
      token: "token-bad",
    });

    sendEachForMulticast.mockResolvedValue({
      responses: [
        {
          success: false,
          error: {
            code: "messaging/third-party-auth-error",
            message: "Auth error from push service",
          },
        },
      ],
    });

    const deliver = createDeliverWebPushNotification({
      config: { projectId: "demo" },
      pushTokenRepository,
      tenantId: "tenant_a",
    });

    const result = await deliver({
      userId: "user_1",
      message: "Hello",
      level: "info",
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(1);
    expect(result.errors[0]).toContain("messaging/third-party-auth-error");
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
