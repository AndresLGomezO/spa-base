import { describe, expect, it, vi } from "vitest";

import { createSendUserNotification } from "./create-send-user-notification.js";
import type { CreateUserNotificationInput } from "./user-notification.js";

describe("createSendUserNotification", () => {
  const input: CreateUserNotificationInput = {
    userId: "user_1",
    message: "Hello",
    level: "info",
    createdAt: "2024-01-01T00:00:00.000Z",
  };

  it("persists the in-app notification", async () => {
    const create = vi.fn(async () => ({ id: "n1" }));
    const send = createSendUserNotification({ create }, "tenant_a");

    await send(input);

    expect(create).toHaveBeenCalledWith("tenant_a", input);
  });

  it("delivers push after persist when deliverPush is provided", async () => {
    const create = vi.fn(async () => ({ id: "n1" }));
    const deliverPush = vi.fn(async () => undefined);
    const send = createSendUserNotification({ create }, "tenant_a", {
      deliverPush,
    });

    await send(input);

    expect(create).toHaveBeenCalledOnce();
    expect(deliverPush).toHaveBeenCalledWith(input);
  });

  it("does not fail in-app persistence when push delivery throws", async () => {
    const create = vi.fn(async () => ({ id: "n1" }));
    const onPushError = vi.fn();
    const send = createSendUserNotification({ create }, "tenant_a", {
      deliverPush: async () => {
        throw new Error("FCM down");
      },
      onPushError,
    });

    await expect(send(input)).resolves.toBeUndefined();
    expect(create).toHaveBeenCalledOnce();
    expect(onPushError).toHaveBeenCalledOnce();
  });

  it("still succeeds when push fails and onPushError is omitted", async () => {
    const create = vi.fn(async () => ({ id: "n1" }));
    const send = createSendUserNotification({ create }, "tenant_a", {
      deliverPush: async () => {
        throw new Error("FCM down");
      },
    });

    await expect(send(input)).resolves.toBeUndefined();
    expect(create).toHaveBeenCalledOnce();
  });
});
