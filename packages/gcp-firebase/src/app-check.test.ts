import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyTokenMock = vi.fn();

vi.mock("firebase-admin/app-check", () => ({
  getAppCheck: () => ({
    verifyToken: verifyTokenMock,
  }),
}));

vi.mock("./firebase-admin.js", () => ({
  initializeFirebaseAdmin: vi.fn(),
}));

import { verifyFirebaseAppCheckToken } from "./app-check.js";

describe("verifyFirebaseAppCheckToken", () => {
  beforeEach(() => {
    verifyTokenMock.mockReset();
  });

  it("bypasses verification when auth emulator host is configured", async () => {
    const result = await verifyFirebaseAppCheckToken("emulator", {
      projectId: "demo-project-base",
      authEmulatorHost: "127.0.0.1:9099",
    });

    expect(result).toEqual({ appId: "emulator", token: "emulator" });
    expect(verifyTokenMock).not.toHaveBeenCalled();
  });

  it("verifies token when auth emulator host is not configured", async () => {
    verifyTokenMock.mockResolvedValue({ appId: "prod-app" });

    const result = await verifyFirebaseAppCheckToken("real-token", {
      projectId: "demo-project-base",
    });

    expect(verifyTokenMock).toHaveBeenCalledWith("real-token");
    expect(result).toEqual({ appId: "prod-app" });
  });
});
