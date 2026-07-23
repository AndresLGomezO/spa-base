import { serializeDataHookForFirestore } from "@repo/gcp-firebase";
import {
  createDataHooksCatalogEnvelope,
  parseDataHooksCatalogJson,
  type DataHookDefinition,
} from "@repo/hooks";
import { describe, expect, it } from "vitest";

import {
  TENANT_BUNDLE_COLLECTION_IMPORT_ORDER,
  assertTenantBundleCollectionImportOrder,
} from "@repo/tenant-bundle";

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

const syntheticHooks: DataHookDefinition[] = [
  {
    id: "hook_1",
    tenantId: "tenant_test",
    name: "Set status",
    entity: "loan",
    phase: "before",
    trigger: { operation: "create" },
    condition: null,
    actions: [
      {
        type: "setField",
        field: "status",
        value: { kind: "literal", value: "Pending" },
      },
    ],
    enabled: true,
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "hook_2",
    tenantId: "tenant_test",
    name: "Generate payment schedule",
    entity: "loan",
    phase: "after",
    trigger: { operation: "create" },
    condition: {
      type: "group",
      combinator: "and",
      children: [
        {
          type: "condition",
          field: "status",
          operator: "==",
          value: { kind: "literal", value: "ACTIVE" },
        },
      ],
    },
    actions: [
      {
        type: "createRecords",
        entity: "paymentSchedule",
        count: { kind: "field", source: "current", path: "periods" },
        data: {
          sequence: { kind: "var", name: "loopIndex" },
          dueDate: {
            kind: "call",
            fn: "dateAdd",
            args: [
              { kind: "field", source: "current", path: "startDate" },
              {
                kind: "binary",
                op: "*",
                left: { kind: "var", name: "loopIndex" },
                right: { kind: "literal", value: 30 },
              },
              { kind: "literal", value: "DAY" },
            ],
          },
        },
      },
    ],
    enabled: true,
    order: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

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
    const parsed = parseDataHooksCatalogJson(
      JSON.stringify(createDataHooksCatalogEnvelope(syntheticHooks)),
    );
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
