import { describe, expect, it } from "vitest";

import {
  TENANT_BUNDLE_COLLECTION_IMPORT_ORDER,
  assertTenantBundleCollectionImportOrder,
} from "@repo/tenant-bundle";

describe("tenant bundle import order", () => {
  it("imports categories before definitions and UI overrides", () => {
    assertTenantBundleCollectionImportOrder([
      ...TENANT_BUNDLE_COLLECTION_IMPORT_ORDER,
    ]);

    const categoriesIndex =
      TENANT_BUNDLE_COLLECTION_IMPORT_ORDER.indexOf("entity_categories");
    const definitionsIndex =
      TENANT_BUNDLE_COLLECTION_IMPORT_ORDER.indexOf("entity_definitions");
    const overridesIndex = TENANT_BUNDLE_COLLECTION_IMPORT_ORDER.indexOf(
      "entity_ui_overrides",
    );

    expect(categoriesIndex).toBeLessThan(definitionsIndex);
    expect(definitionsIndex).toBeLessThan(overridesIndex);
  });
});
