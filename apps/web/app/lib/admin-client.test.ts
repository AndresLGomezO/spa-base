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

import {
  listAdminUsers,
  listAdminTenants,
  createAdminTenant,
} from "./admin-client";

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

  it("loads admin tenants with auth headers", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        tenants: [
          {
            id: "tenant_a",
            name: "Tenant A",
            status: "active",
            createdBy: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    });

    const tenants = await listAdminTenants();

    expect(tenants).toHaveLength(1);
    expect(tenants[0]?.name).toBe("Tenant A");
  });

  it("creates an admin tenant", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        tenant: {
          id: "tenant_new",
          name: "New Tenant",
          status: "active",
          createdBy: "superadmin",
          createdAt: "2026-01-02T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      }),
    });

    const tenant = await createAdminTenant({ name: "New Tenant" });

    expect(tenant.id).toBe("tenant_new");
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/admin/tenants", "http://127.0.0.1:3000"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "New Tenant" }),
      }),
    );
  });
});
