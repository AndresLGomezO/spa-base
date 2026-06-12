import { describe, expect, it } from "vitest";

import { mergeTenantSessionFields } from "./merge-tenant-session-fields";

describe("mergeTenantSessionFields", () => {
  it("falls back to select-tenant permissions when sync returns empty permissions", () => {
    const merged = mergeTenantSessionFields(
      "tenant_a",
      {
        tenantId: "tenant_a",
        permissions: ["widget.read", "widget.create"],
        isSuperAdmin: false,
        availableTenants: ["tenant_a"],
        tenantOptions: [{ id: "tenant_a", name: "Tenant A" }],
        tenantRoleNames: ["viewer"],
        activeTenantName: "Tenant A",
        tenantAppearance: null,
      },
      {
        tenantId: null,
        permissions: [],
        isSuperAdmin: false,
        availableTenants: [],
        tenantOptions: [],
        tenantRoleNames: [],
        activeTenantName: null,
        tenantAppearance: null,
      },
    );

    expect(merged.tenantId).toBe("tenant_a");
    expect(merged.permissions).toEqual(["widget.read", "widget.create"]);
    expect(merged.availableTenants).toEqual(["tenant_a"]);
    expect(merged.tenantOptions).toEqual([
      { id: "tenant_a", name: "Tenant A" },
    ]);
    expect(merged.tenantRoleNames).toEqual(["viewer"]);
    expect(merged.activeTenantName).toBe("Tenant A");
  });

  it("prefers sync session data when both sync and select-tenant provide values", () => {
    const merged = mergeTenantSessionFields(
      "tenant_b",
      {
        tenantId: "tenant_a",
        permissions: ["widget.read"],
        isSuperAdmin: false,
        availableTenants: ["tenant_a"],
        tenantOptions: [{ id: "tenant_a", name: "Tenant A" }],
        tenantRoleNames: ["viewer"],
        activeTenantName: "Tenant A",
        tenantAppearance: null,
      },
      {
        tenantId: "tenant_b",
        permissions: ["order.read"],
        isSuperAdmin: true,
        availableTenants: ["tenant_a", "tenant_b"],
        tenantOptions: [
          { id: "tenant_a", name: "Tenant A" },
          { id: "tenant_b", name: "Tenant B" },
        ],
        tenantRoleNames: ["admin"],
        activeTenantName: "Tenant B",
        tenantAppearance: { logoUrl: "https://example.com/logo.png" },
      },
    );

    expect(merged.tenantId).toBe("tenant_b");
    expect(merged.permissions).toEqual(["order.read"]);
    expect(merged.isSuperAdmin).toBe(true);
    expect(merged.availableTenants).toEqual(["tenant_a", "tenant_b"]);
    expect(merged.activeTenantName).toBe("Tenant B");
    expect(merged.tenantAppearance).toEqual({
      logoUrl: "https://example.com/logo.png",
    });
  });
});
