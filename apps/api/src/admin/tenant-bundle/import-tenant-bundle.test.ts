import { serializeDataHookForFirestore } from "@repo/gcp-firebase";
import { parseDataHooksCatalogJson } from "@repo/hooks";
import { describe, expect, it } from "vitest";

import {
  TENANT_BUNDLE_COLLECTION_IMPORT_ORDER,
  assertTenantBundleCollectionImportOrder,
} from "@repo/tenant-bundle";

import { loadDataHooksCatalogJson } from "../rates-tenant/seed-catalog-dir.js";

function maxFirestoreDepth(value: unknown, depth = 0): number {
  if (value === null || typeof value !== "object") {
    return depth;
  }
  if (Array.isArray(value)) {
    return Math.max(
      depth,
      ...value.map((entry) => maxFirestoreDepth(entry, depth + 1)),
    );
  }
  return Math.max(
    depth,
    ...Object.values(value).map((entry) => maxFirestoreDepth(entry, depth + 1)),
  );
}

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

  it("serializes imported data hooks within Firestore nesting limits", () => {
    const parsed = parseDataHooksCatalogJson(loadDataHooksCatalogJson());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    for (const hook of parsed.data.dataHooks) {
      const serialized = serializeDataHookForFirestore({
        id: "hook_test",
        tenantId: "tenant_test",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        phase: hook.phase ?? "after",
        trigger: hook.trigger,
        condition: hook.condition ?? null,
        actions: hook.actions,
        enabled: hook.enabled ?? true,
        order: hook.order ?? 0,
        name: hook.name,
        entity: hook.entity,
      });

      expect(maxFirestoreDepth(serialized)).toBeLessThanOrEqual(20);
    }
  });
});
