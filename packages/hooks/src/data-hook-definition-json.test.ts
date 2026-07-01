import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { DATA_HOOK_COOKBOOK_FIXTURES } from "./data-hook-cookbook-fixtures.js";
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

  it("parses every cookbook fixture as a valid portable definition", () => {
    for (const fixture of DATA_HOOK_COOKBOOK_FIXTURES) {
      const parsed = parseDataHookDefinitionJson(
        JSON.stringify(createDataHookDefinitionEnvelope(fixture)),
      );
      expect(parsed.ok, fixture.name).toBe(true);
    }
  });

  it("parses cookbook fixtures as a valid catalog envelope", () => {
    const parsed = parseDataHooksCatalogJson(
      JSON.stringify({
        kind: "data-hooks-catalog",
        version: 1,
        exportedAt: "2026-07-01T13:00:00.000Z",
        dataHooks: DATA_HOOK_COOKBOOK_FIXTURES,
      }),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.dataHooks).toHaveLength(
        DATA_HOOK_COOKBOOK_FIXTURES.length,
      );
    }
  });

  it("round-trips each cookbook fixture through single-definition envelope", () => {
    for (const fixture of DATA_HOOK_COOKBOOK_FIXTURES) {
      const envelope = createDataHookDefinitionEnvelope(fixture);
      const parsed = parseDataHookDefinitionJson(JSON.stringify(envelope));
      expect(parsed.ok, fixture.name).toBe(true);
      if (parsed.ok) {
        expect(parsed.data.name).toBe(fixture.name);
        expect(parsed.data.entity).toBe(fixture.entity);
      }
    }
  });

  it("parses rates tenant data hooks catalog", () => {
    const catalogPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../apps/api/src/admin/rates-tenant/catalogs/rates-data-hooks.json",
    );
    const parsed = parseDataHooksCatalogJson(readFileSync(catalogPath, "utf8"));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const hooks = parsed.data.dataHooks;
    expect(hooks.length).toBe(24);

    const enabled = hooks.filter((hook) => hook.enabled);
    expect(enabled.length).toBe(24);

    const ratesEntities = new Set([
      "actor",
      "account",
      "category",
      "financialItem",
      "loanDetails",
      "incomeDetails",
      "investmentDetails",
      "serviceDetails",
      "transaction",
      "paymentSchedule",
      "balanceSnapshot",
    ]);
    for (const hook of hooks) {
      expect(ratesEntities.has(hook.entity), hook.entity).toBe(true);
    }

    const markPaid = hooks.find((hook) => hook.name === "Mark schedule PAID");
    expect(markPaid?.entity).toBe("transaction");
    expect(markPaid?.chainHooks).toBe(true);

    const overdue = hooks.find(
      (hook) => hook.name === "Mark overdue schedules",
    );
    expect(overdue?.trigger).toMatchObject({
      kind: "schedule",
      scope: "eachRecord",
    });

    const flatLoan = hooks.find(
      (hook) => hook.name === "Generate flat loan plan",
    );
    expect(flatLoan?.enabled).toBe(true);
    expect(
      flatLoan?.actions.some((action) => action.type === "createRecords"),
    ).toBe(true);

    expect(
      hooks.some((hook) => hook.name === "Derive balance sheet role on create"),
    ).toBe(true);
    expect(hooks.some((hook) => hook.name === "Extend schedule horizon")).toBe(
      true,
    );
    expect(
      hooks.some((hook) => hook.name === "Update accounts on transfer"),
    ).toBe(true);
  });
});
