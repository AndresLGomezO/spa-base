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
    expect(expandGrant("organization.*", known)).toEqual([
      "organization.read",
      "organization.create",
      "organization.update",
      "organization.delete",
    ]);
  });

  it("expands action wildcard", () => {
    expect(expandGrant("*.read", known)).toEqual([
      "organization.read",
      "project.read",
      "entityDefinition.read",
      "hook.read",
      "role.read",
    ]);
  });

  it("returns exact grant when not a wildcard", () => {
    expect(expandGrant("organization.read", known)).toEqual([
      "organization.read",
    ]);
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
    ).toEqual([
      "organization.read",
      "project.read",
      "entityDefinition.read",
      "hook.read",
      "role.read",
    ]);
  });

  it("resolves editor role without delete permissions", () => {
    const permissions = resolvePermissions({
      tenantId: "tenant_a",
      tenants: { tenant_a: ["editor"] },
    });

    expect(permissions).toHaveLength(15);
    expect(permissions).toEqual(
      expect.arrayContaining([
        "organization.read",
        "organization.create",
        "organization.update",
        "project.read",
        "project.create",
        "project.update",
        "entityDefinition.read",
        "entityDefinition.create",
        "entityDefinition.update",
        "hook.read",
        "hook.create",
        "hook.update",
        "role.read",
        "role.create",
        "role.update",
      ]),
    );
    expect(permissions).not.toContain("organization.delete");
    expect(permissions).not.toContain("project.delete");
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
    ).toEqual([
      "organization.read",
      "project.read",
      "entityDefinition.read",
      "hook.read",
      "role.read",
    ]);
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
    expect(hasPermission("organization.read", ["organization.read"])).toBe(
      true,
    );
  });

  it("denies missing permission", () => {
    expect(hasPermission("organization.delete", ["organization.read"])).toBe(
      false,
    );
  });

  it("matches required action wildcards", () => {
    expect(hasPermission("*.read", ["organization.read"])).toBe(true);
    expect(hasPermission("*.read", ["organization.create"])).toBe(false);
  });

  it("matches required entity wildcards", () => {
    expect(
      hasPermission("organization.*", ["organization.read", "project.read"]),
    ).toBe(true);
  });

  it("bypasses checks for superadmin", () => {
    expect(
      hasPermission("organization.delete", [], { isSuperAdmin: true }),
    ).toBe(true);
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
      expandGrants(["*.read", "organization.read"], ALL_KNOWN_PERMISSIONS),
    ).toEqual([
      "organization.read",
      "project.read",
      "entityDefinition.read",
      "hook.read",
      "role.read",
    ]);
  });
});
