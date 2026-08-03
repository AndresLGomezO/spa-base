import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { describe, expect, it } from "vitest";

import { ALL_KNOWN_PERMISSIONS } from "./known-permissions.js";
import { isPlatformSuperAdmin } from "./platform-role.js";
import { expandGrant, expandGrants, hasPermission } from "./role-matcher.js";
import { resolvePermissions } from "./resolve-permissions.js";
import { isTenantBuiltInAdminRole } from "./roles.js";

function canWriteEntityUiOverride(grants: readonly string[]): boolean {
  return ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS.some((permission) =>
    hasPermission(permission, grants),
  );
}

describe("expandGrant", () => {
  const known = ALL_KNOWN_PERMISSIONS;

  it("expands global wildcard", () => {
    expect(expandGrant("*", known)).toEqual([...known]);
  });

  it("expands entity wildcard", () => {
    expect(expandGrant("entityDefinition.*", known)).toEqual([
      "entityDefinition.read",
      "entityDefinition.create",
      "entityDefinition.update",
    ]);
  });

  it("expands action wildcard", () => {
    expect(expandGrant("*.read", known)).toEqual([
      "entityDefinition.read",
      "entityUiOverride.read",
      "entityCategory.read",
      "internalEntity.read",
      "hook.read",
      "formula.read",
      "localePack.read",
      "metricDefinition.read",
      "metricValue.read",
      "entityQueryDefinition.read",
      "chartDefinition.read",
      "customView.read",
      "debug.read",
      "ai.chat.read",
      "ai.uiBuilder.read",
      "ai.dataHook.read",
      "ai.documentExtract.read",
      "aiContextSection.read",
      "aiRecordSummaryTemplate.read",
      "role.read",
      "tenantUser.read",
    ]);
  });

  it("returns exact grant when not a wildcard", () => {
    expect(expandGrant("entityDefinition.read", known)).toEqual([
      "entityDefinition.read",
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
    const permissions = resolvePermissions({
      tenantId: "tenant_a",
      tenants: { tenant_a: ["admin"] },
    });

    expect(permissions).toEqual([...ALL_KNOWN_PERMISSIONS]);
    expect(permissions).toContain("entityQueryDefinition.delete");
  });

  it("resolves viewer role to read-only permissions", () => {
    expect(
      resolvePermissions({
        tenantId: "tenant_a",
        tenants: { tenant_a: ["viewer"] },
      }),
    ).toEqual([
      "entityDefinition.read",
      "entityUiOverride.read",
      "entityCategory.read",
      "internalEntity.read",
      "hook.read",
      "formula.read",
      "localePack.read",
      "metricDefinition.read",
      "metricValue.read",
      "entityQueryDefinition.read",
      "chartDefinition.read",
      "customView.read",
      "debug.read",
      "ai.chat.read",
      "ai.uiBuilder.read",
      "ai.dataHook.read",
      "ai.documentExtract.read",
      "aiContextSection.read",
      "aiRecordSummaryTemplate.read",
      "role.read",
      "tenantUser.read",
    ]);
  });

  it("resolves editor role without delete permissions", () => {
    const permissions = resolvePermissions({
      tenantId: "tenant_a",
      tenants: { tenant_a: ["editor"] },
    });

    expect(permissions).toHaveLength(47);
    expect(permissions).toEqual(
      expect.arrayContaining([
        "entityDefinition.read",
        "entityDefinition.create",
        "entityDefinition.update",
        "entityCategory.read",
        "entityCategory.create",
        "entityCategory.update",
        "hook.read",
        "hook.create",
        "hook.update",
        "role.read",
        "role.create",
        "role.update",
        "tenantUser.read",
        "tenantUser.create",
        "tenantUser.update",
        "entityUiOverride.read",
        "entityUiOverride.update",
        "entityQueryDefinition.read",
        "entityQueryDefinition.create",
        "entityQueryDefinition.update",
        "customView.read",
        "customView.create",
        "customView.update",
        "ai.uiBuilder.read",
        "ai.documentExtract.read",
      ]),
    );
    expect(permissions).not.toContain("entityDefinition.delete");
    expect(permissions).not.toContain("customView.delete");
    expect(permissions).not.toContain("tenantUser.remove");
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
      "entityDefinition.read",
      "entityUiOverride.read",
      "entityCategory.read",
      "internalEntity.read",
      "hook.read",
      "formula.read",
      "localePack.read",
      "metricDefinition.read",
      "metricValue.read",
      "entityQueryDefinition.read",
      "chartDefinition.read",
      "customView.read",
      "debug.read",
      "ai.chat.read",
      "ai.uiBuilder.read",
      "ai.dataHook.read",
      "ai.documentExtract.read",
      "aiContextSection.read",
      "aiRecordSummaryTemplate.read",
      "role.read",
      "tenantUser.read",
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
    expect(
      hasPermission("entityDefinition.read", ["entityDefinition.read"]),
    ).toBe(true);
  });

  it("denies missing permission", () => {
    expect(
      hasPermission("entityDefinition.update", ["entityDefinition.read"]),
    ).toBe(false);
  });

  it("matches required action wildcards", () => {
    expect(hasPermission("*.read", ["entityDefinition.read"])).toBe(true);
    expect(hasPermission("*.read", ["entityDefinition.create"])).toBe(false);
  });

  it("matches required entity wildcards", () => {
    expect(
      hasPermission("entityDefinition.*", [
        "entityDefinition.read",
        "hook.read",
      ]),
    ).toBe(true);
  });

  it("bypasses checks for superadmin", () => {
    expect(
      hasPermission("entityDefinition.update", [], { isSuperAdmin: true }),
    ).toBe(true);
  });

  it("allows any required permission when resolved grants include *", () => {
    expect(hasPermission("entityQueryDefinition.read", ["*"])).toBe(true);
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
      expandGrants(["*.read", "entityDefinition.read"], ALL_KNOWN_PERMISSIONS),
    ).toEqual([
      "entityDefinition.read",
      "entityUiOverride.read",
      "entityCategory.read",
      "internalEntity.read",
      "hook.read",
      "formula.read",
      "localePack.read",
      "metricDefinition.read",
      "metricValue.read",
      "entityQueryDefinition.read",
      "chartDefinition.read",
      "customView.read",
      "debug.read",
      "ai.chat.read",
      "ai.uiBuilder.read",
      "ai.dataHook.read",
      "ai.documentExtract.read",
      "aiContextSection.read",
      "aiRecordSummaryTemplate.read",
      "role.read",
      "tenantUser.read",
    ]);
  });
});

describe("entity UI override write permissions", () => {
  const entityUpdateOnlyGrants = [
    "account.update",
    "transaction.read",
  ] as const;

  it("still matches *.update for entity-level grants", () => {
    expect(hasPermission("*.update", entityUpdateOnlyGrants)).toBe(true);
  });

  it("denies layout write when grants only include entity *.update", () => {
    expect(canWriteEntityUiOverride(entityUpdateOnlyGrants)).toBe(false);
  });

  it("allows layout write with entityUiOverride.update", () => {
    expect(
      canWriteEntityUiOverride([
        ...entityUpdateOnlyGrants,
        "entityUiOverride.update",
      ]),
    ).toBe(true);
  });

  it("allows layout write for tenant built-in admin via role name", () => {
    expect(isTenantBuiltInAdminRole(["admin"])).toBe(true);
  });

  it("resolves editor role with entityUiOverride.update", () => {
    const permissions = resolvePermissions({
      tenantId: "tenant_a",
      tenants: { tenant_a: ["editor"] },
    });

    expect(canWriteEntityUiOverride(permissions)).toBe(true);
  });
});
