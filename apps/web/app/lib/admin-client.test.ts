import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/app-config", () => ({
  appConfig: {
    apiBaseUrl: "http://127.0.0.1:3000",
  },
}));

vi.mock("./app-check", () => ({
  getAppCheckHeaderValue: vi.fn(async () => "emulator"),
}));

vi.mock("./firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn(async () => "id-token"),
    },
  },
}));

import { listAdminUsers } from "./admin-client";

describe("admin-client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads admin users with auth headers", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        items: [
          {
            uid: "user_1",
            email: "demo@example.com",
            displayName: "Demo",
            platformRole: null,
            tenants: { tenant_a: ["viewer"] },
          },
        ],
      }),
    });

    const users = await listAdminUsers();

    expect(users).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/admin/users", "http://127.0.0.1:3000"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer id-token",
        }),
      }),
    );
  });
});
