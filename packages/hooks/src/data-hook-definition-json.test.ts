import { describe, expect, it } from "vitest";

import type { DataHookDefinition } from "./data-hook-definition.js";
import {
  catalogHookKey,
  computeDataHooksCatalogReplacePlan,
  createDataHookDefinitionEnvelope,
  createDataHooksCatalogEnvelope,
  parseDataHookDefinitionJson,
  parseDataHooksCatalogJson,
  toPortableDataHookDefinition,
} from "./data-hook-definition-json.js";

const baseRecord: DataHookDefinition = {
  id: "hook_1",
  tenantId: "tenant_a",
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
};

describe("data-hook-definition-json", () => {
  it("round-trips single hook envelopes", () => {
    const envelope = createDataHookDefinitionEnvelope(
      toPortableDataHookDefinition(baseRecord),
    );
    const parsed = parseDataHookDefinitionJson(
      JSON.stringify(envelope, null, 2),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.name).toBe("Set status");
      expect(parsed.data.entity).toBe("loan");
    }
  });

  it("strips server metadata for portable catalog export", () => {
    const portable = toPortableDataHookDefinition(baseRecord);
    expect(portable).not.toHaveProperty("id");
    expect(portable).not.toHaveProperty("tenantId");
    expect(portable.name).toBe("Set status");
  });

  it("validates duplicate entity+name pairs in catalog", () => {
    const envelope = {
      kind: "data-hooks-catalog" as const,
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      dataHooks: [
        toPortableDataHookDefinition(baseRecord),
        toPortableDataHookDefinition(baseRecord),
      ],
    };
    const parsed = parseDataHooksCatalogJson(JSON.stringify(envelope));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors[0]?.message).toContain("Set status");
    }
  });

  it("allows same hook name on different entities", () => {
    const envelope = createDataHooksCatalogEnvelope([
      baseRecord,
      { ...baseRecord, id: "hook_2", name: "Set status", entity: "payment" },
    ]);
    const parsed = parseDataHooksCatalogJson(JSON.stringify(envelope));
    expect(parsed.ok).toBe(true);
  });

  it("computes replace plan by entity+name", () => {
    const existing: DataHookDefinition[] = [
      baseRecord,
      {
        ...baseRecord,
        id: "hook_2",
        name: "Notify",
        entity: "loan",
      },
      {
        ...baseRecord,
        id: "hook_3",
        name: "Set status",
        entity: "payment",
      },
    ];

    const plan = computeDataHooksCatalogReplacePlan({
      existing,
      imported: [
        toPortableDataHookDefinition({
          ...baseRecord,
          actions: [
            {
              type: "setField",
              field: "status",
              value: { kind: "literal", value: "Approved" },
            },
          ],
        }),
        toPortableDataHookDefinition({
          ...baseRecord,
          name: "New hook",
          entity: "loan",
        }),
      ],
    });

    expect(plan.counts).toEqual({ created: 1, updated: 1, deleted: 2 });
    expect(plan.toDelete.map((hook) => catalogHookKey(hook)).sort()).toEqual(
      ["loan\0Notify", "payment\0Set status"].sort(),
    );
  });
});
