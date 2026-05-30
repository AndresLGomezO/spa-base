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

import { createAdminTenant, getAdminTenant } from "./admin-client";

describe("admin-client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads a tenant by id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        tenant: {
          id: "tenant_a",
          name: "Tenant A",
          status: "active",
          createdBy: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    });

    const tenant = await getAdminTenant("tenant_a");

    expect(tenant.name).toBe("Tenant A");
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/admin/tenants/tenant_a", "http://127.0.0.1:3000"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer id-token",
        }),
      }),
    );
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
