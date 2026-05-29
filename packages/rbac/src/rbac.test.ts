import { describe, expect, it } from "vitest";

import { ALL_KNOWN_PERMISSIONS } from "./known-permissions.js";
import { isPlatformSuperAdmin } from "./platform-role.js";
import { expandGrant, expandGrants, hasPermission } from "./role-matcher.js";
import { resolvePermissions } from "./resolve-permissions.js";

describe("expandGrant", () => {
  const known = ALL_KNOWN_PERMISSIONS;

  it("expands global wildcard", () => {
    expect(expandGrant("*", known)).toEqual([...known]);
  });

  it("expands entity wildcard", () => {
    expect(expandGrant("customer.*", known)).toEqual([
      "customer.read",
      "customer.create",
      "customer.update",
      "customer.delete",
    ]);
  });

  it("expands action wildcard", () => {
    expect(expandGrant("*.read", known)).toEqual([
      "customer.read",
      "order.read",
    ]);
  });

  it("returns exact grant when not a wildcard", () => {
    expect(expandGrant("customer.read", known)).toEqual(["customer.read"]);
  });
});

describe("resolvePermissions", () => {
  it("denies by default when user has no roles", () => {
    expect(
      resolvePermissions({
        tenantId: "tenant_a",
      }),
    ).toEqual([]);
  });

  it("resolves admin role to all permissions", () => {
    expect(
      resolvePermissions({
        tenantId: "tenant_a",
        tenants: { tenant_a: ["admin"] },
      }),
    ).toEqual([...ALL_KNOWN_PERMISSIONS]);
  });

  it("resolves viewer role to read-only permissions", () => {
    expect(
      resolvePermissions({
        tenantId: "tenant_a",
        tenants: { tenant_a: ["viewer"] },
      }),
    ).toEqual(["customer.read", "order.read"]);
  });

  it("resolves editor role without delete permissions", () => {
    const permissions = resolvePermissions({
      tenantId: "tenant_a",
      tenants: { tenant_a: ["editor"] },
    });

    expect(permissions).toHaveLength(6);
    expect(permissions).toEqual(
      expect.arrayContaining([
        "customer.read",
        "customer.create",
        "customer.update",
        "order.read",
        "order.create",
        "order.update",
      ]),
    );
    expect(permissions).not.toContain("customer.delete");
    expect(permissions).not.toContain("order.delete");
  });

  it("scopes permissions to the active tenant", () => {
    expect(
      resolvePermissions({
        tenantId: "tenant_b",
        tenants: {
          tenant_a: ["admin"],
          tenant_b: ["viewer"],
        },
      }),
    ).toEqual(["customer.read", "order.read"]);
  });

  it("returns all permissions for platform superadmin", () => {
    expect(
      resolvePermissions({
        tenantId: "tenant_a",
        platformRole: "superadmin",
      }),
    ).toEqual([...ALL_KNOWN_PERMISSIONS]);
  });

  it("returns all permissions for platform.superadmin role value", () => {
    expect(
      resolvePermissions({
        tenantId: "tenant_a",
        platformRole: "platform.superadmin",
      }),
    ).toEqual([...ALL_KNOWN_PERMISSIONS]);
  });
});

describe("hasPermission", () => {
  it("allows exact permission match", () => {
    expect(hasPermission("customer.read", ["customer.read"])).toBe(true);
  });

  it("denies missing permission", () => {
    expect(hasPermission("customer.delete", ["customer.read"])).toBe(false);
  });

  it("bypasses checks for superadmin", () => {
    expect(hasPermission("customer.delete", [], { isSuperAdmin: true })).toBe(
      true,
    );
  });
});

describe("isPlatformSuperAdmin", () => {
  it("recognizes superadmin aliases", () => {
    expect(isPlatformSuperAdmin("superadmin")).toBe(true);
    expect(isPlatformSuperAdmin("platform.superadmin")).toBe(true);
    expect(isPlatformSuperAdmin("admin")).toBe(false);
    expect(isPlatformSuperAdmin(null)).toBe(false);
  });
});

describe("expandGrants", () => {
  it("deduplicates overlapping grants", () => {
    expect(
      expandGrants(["*.read", "customer.read"], ALL_KNOWN_PERMISSIONS),
    ).toEqual(["customer.read", "order.read"]);
  });
});
