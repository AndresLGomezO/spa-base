import { describe, expect, it } from "vitest";

import {
  buildRoleCatalog,
  buildTenantRoleCatalog,
} from "./build-role-catalog.js";
import { resolvePermissions } from "./resolve-permissions.js";

describe("buildRoleCatalog", () => {
  it("merges firestore roles with built-in fallback", () => {
    const catalog = buildRoleCatalog([
      {
        name: "custom",
        grants: ["customer.read"],
        tenantId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    expect(catalog.custom?.grants).toEqual(["customer.read"]);
    expect(catalog.admin?.grants).toContain("*");
  });

  it("merges built-in grants when tenant admin role has stale firestore grants", () => {
    const catalog = buildTenantRoleCatalog([
      {
        id: "admin",
        tenantId: "tenant_a",
        name: "admin",
        grants: ["role.read"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    expect(catalog.admin?.grants).toContain("*");

    const permissions = resolvePermissions(
      {
        tenantId: "tenant_a",
        tenants: { tenant_a: ["admin"] },
      },
      {
        roleCatalog: catalog,
        knownPermissions: [
          "role.read",
          "role.update",
          "entityUiOverride.update",
        ],
      },
    );

    expect(permissions).toContain("entityUiOverride.update");
  });
});
