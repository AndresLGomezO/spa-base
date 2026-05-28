import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/gcp-firebase", () => ({
  verifyFirebaseIdToken: vi.fn(async () => ({
    uid: "user_123",
    email: "demo@example.com",
    role: "admin",
  })),
  verifyFirebaseAppCheckToken: vi.fn(async () => ({
    appId: "demo-app-id",
  })),
}));

import { buildServer } from "../server.js";

describe("GET /auth/validate", () => {
  it("returns 401 when headers are missing", async () => {
    const server = await buildServer();
    const response = await server.inject({
      method: "GET",
      url: "/auth/validate",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().ok).toBe(false);
  });

  it("returns success when headers are present", async () => {
    const server = await buildServer();
    const response = await server.inject({
      method: "GET",
      url: "/auth/validate",
      headers: {
        authorization: "Bearer fake-token",
        "x-firebase-appcheck": "fake-appcheck",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      user: { uid: "user_123", email: "demo@example.com" },
      appCheck: { appId: "demo-app-id" },
    });
  });
});
