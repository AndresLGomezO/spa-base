import { describe, expect, it } from "vitest";

import { buildRoleCatalog } from "./build-role-catalog.js";

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
    expect(catalog.admin?.grants).toEqual(["*"]);
  });
});
