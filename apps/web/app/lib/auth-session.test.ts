import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/app-config", () => ({
  appConfig: {
    apiBaseUrl: "http://127.0.0.1:3000",
  },
}));

vi.mock("./app-check", () => ({
  getAppCheckHeaderValue: vi.fn(async () => "emulator"),
}));

import { selectTenantSession, syncAuthSession } from "./auth-session";

describe("syncAuthSession", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("calls /auth/validate with bearer and app check headers", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        user: {
          uid: "user_123",
          email: "demo@example.com",
          permissions: ["customer.read"],
          isSuperAdmin: false,
          tenantId: "tenant_a",
          availableTenants: ["tenant_a", "tenant_b"],
        },
      }),
    });

    const firebaseUser = {
      getIdToken: vi.fn(async () => "id-token"),
    };

    const result = await syncAuthSession(firebaseUser as never);

    expect(result).toEqual({
      ok: true,
      user: {
        uid: "user_123",
        email: "demo@example.com",
        permissions: ["customer.read"],
        isSuperAdmin: false,
        tenantId: "tenant_a",
        availableTenants: ["tenant_a", "tenant_b"],
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/auth/validate", "http://127.0.0.1:3000"),
      {
        method: "GET",
        headers: {
          Authorization: "Bearer id-token",
          "X-Firebase-AppCheck": "emulator",
        },
      },
    );
  });

  it("returns error when API responds with failure", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        ok: false,
        message: "Token verification failed.",
      }),
    });

    const firebaseUser = {
      getIdToken: vi.fn(async () => "id-token"),
    };

    const result = await syncAuthSession(firebaseUser as never);

    expect(result).toEqual({
      ok: false,
      error: "Token verification failed.",
    });
  });

  it("calls /auth/select-tenant with tenant id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        tenantId: "tenant_b",
        availableTenants: ["tenant_a", "tenant_b"],
        permissions: ["customer.read", "customer.create"],
        isSuperAdmin: false,
      }),
    });

    const firebaseUser = {
      getIdToken: vi.fn(async () => "id-token"),
    };

    const result = await selectTenantSession(firebaseUser as never, "tenant_b");

    expect(result).toEqual({
      ok: true,
      tenantId: "tenant_b",
      availableTenants: ["tenant_a", "tenant_b"],
      permissions: ["customer.read", "customer.create"],
      isSuperAdmin: false,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/auth/select-tenant", "http://127.0.0.1:3000"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ tenantId: "tenant_b" }),
      }),
    );
  });
});
