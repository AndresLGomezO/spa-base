import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/app-config", () => ({
  appConfig: {
    apiBaseUrl: "http://127.0.0.1:3000",
  },
}));

vi.mock("./app-check", () => ({
  getAppCheckHeaderValue: vi.fn(async () => "emulator"),
}));

vi.mock("./fetch-rate-limit-retry", () => ({
  fetchWithRateLimitRetry: (input: URL, init: RequestInit): Promise<Response> =>
    fetch(input, init),
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
          permissions: ["widget.read"],
          isSuperAdmin: false,
          tenantId: "tenant_a",
          availableTenants: ["tenant_a", "tenant_b"],
          tenantOptions: [
            { id: "tenant_a", name: "Tenant A" },
            { id: "tenant_b", name: "Tenant B" },
          ],
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
        permissions: ["widget.read"],
        isSuperAdmin: false,
        tenantId: "tenant_a",
        availableTenants: ["tenant_a", "tenant_b"],
        tenantOptions: [
          { id: "tenant_a", name: "Tenant A" },
          { id: "tenant_b", name: "Tenant B" },
        ],
        tenantRoleNames: [],
        activeTenantName: null,
        tenantAppearance: null,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/auth/validate", "http://127.0.0.1:3000"),
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer id-token",
          "X-Firebase-AppCheck": "emulator",
        },
      }),
    );
  });

  it("returns transient error on rate limit without signing out semantics", async () => {
    fetchMock.mockResolvedValue({
      status: 429,
      ok: false,
      json: async () => ({
        ok: false,
        message: "Rate limit exceeded, retry in 7 seconds",
      }),
    });

    const firebaseUser = {
      getIdToken: vi.fn(async () => "id-token"),
    };

    const result = await syncAuthSession(firebaseUser as never);

    expect(result).toEqual({
      ok: false,
      transient: true,
      error: "Rate limit exceeded, retry in 7 seconds",
    });
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
        tenantOptions: [
          { id: "tenant_a", name: "Tenant A" },
          { id: "tenant_b", name: "Tenant B" },
        ],
        permissions: ["widget.read", "widget.create"],
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
      tenantOptions: [
        { id: "tenant_a", name: "Tenant A" },
        { id: "tenant_b", name: "Tenant B" },
      ],
      permissions: ["widget.read", "widget.create"],
      isSuperAdmin: false,
      tenantRoleNames: [],
      activeTenantName: null,
      tenantAppearance: null,
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
