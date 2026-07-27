import { describe, expect, it, vi } from "vitest";

import type { DataHookDefinition } from "./data-hook-definition.js";
import { runDataHook } from "./interpret-data-hook.js";
import { mockHookEntityServices } from "./test/mock-hook-entity-services.js";
import type { HookContext, HookEntityRecord } from "./types.js";

/**
 * Domain-neutral fixture mirroring matchRelatedRecord → setField short-circuit
 * (same shape as tenant categorize hooks; no .local catalog coupling).
 */
const matchAndLabelDefinition: DataHookDefinition = {
  id: "hook_match_and_label",
  tenantId: "tenant_a",
  name: "Match prior item and label",
  entity: "item",
  phase: "after",
  trigger: {
    kind: "schedule",
    cron: "0 */2 * * *",
    timezone: "UTC",
    scope: "eachRecord",
    eachRecordWhere: {
      type: "condition",
      field: "labelStatus",
      operator: "==",
      value: { kind: "literal", value: "PENDING" },
    },
  },
  condition: null,
  actions: [
    {
      type: "matchRelatedRecord",
      entity: "item",
      where: {
        type: "condition",
        field: "labelStatus",
        operator: "==",
        value: { kind: "literal", value: "DONE" },
      },
      haystack: {
        kind: "call",
        fn: "normalizeMatchText",
        args: [{ kind: "field", source: "current", path: "description" }],
      },
      aliasField: "description",
      as: "priorItem",
    },
    {
      type: "setField",
      field: "labelId",
      value: {
        kind: "field",
        source: "loaded",
        alias: "priorItem",
        path: "labelId",
      },
    },
    {
      type: "setField",
      field: "normalizedDescription",
      value: {
        kind: "call",
        fn: "normalizeMatchText",
        args: [{ kind: "field", source: "current", path: "description" }],
      },
    },
    {
      type: "setField",
      field: "labelStatus",
      value: {
        kind: "call",
        fn: "if",
        args: [
          {
            kind: "call",
            fn: "isEmpty",
            args: [
              {
                kind: "field",
                source: "loaded",
                alias: "priorItem",
                path: "labelId",
              },
            ],
          },
          { kind: "literal", value: "NEEDS_MANUAL" },
          { kind: "literal", value: "DONE" },
        ],
      },
    },
  ],
  enabled: true,
  order: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("matchRelatedRecord categorize short-circuit", () => {
  it("inherits labelId from a prior DONE item without calling AI", async () => {
    const callAi = vi.fn(async () => {
      throw new Error("callAi must not run for a match-path short-circuit");
    });

    const donePrior: HookEntityRecord = {
      id: "item_done",
      tenantId: "tenant_a",
      description: "ACME *ES-ORDER 12",
      labelId: "label_ops",
      labelStatus: "DONE",
    };
    const pending: Record<string, unknown> = {
      id: "item_pending",
      tenantId: "tenant_a",
      description: "ACME *ORDER 987 ES",
      labelStatus: "PENDING",
    };

    const updates: Array<{
      entity: string;
      id: string;
      patch: Record<string, unknown>;
    }> = [];

    const list = vi.fn(
      async (entity: string, query: { field: string; value: unknown }) => {
        if (
          entity === "item" &&
          query.field === "labelStatus" &&
          query.value === "DONE"
        ) {
          return [donePrior];
        }
        return [];
      },
    );

    const update = vi.fn(
      async (
        entity: string,
        id: string,
        patch: Record<string, unknown>,
      ): Promise<HookEntityRecord> => {
        updates.push({ entity, id, patch });
        if (entity === "item" && id === pending.id) {
          Object.assign(pending, patch);
        }
        return { id, tenantId: "tenant_a", ...patch };
      },
    );

    const context: HookContext = {
      tenantId: "tenant_a",
      entityName: "item",
      event: "item.afterSchedule",
      current: pending,
      user: { uid: "user_1" },
      loaded: {},
      services: {
        callAi,
        entities: mockHookEntityServices({ list, update }),
        logger: { info: vi.fn(), error: vi.fn() },
      },
    };

    await runDataHook(matchAndLabelDefinition, context);

    expect(callAi).not.toHaveBeenCalled();
    expect(pending.labelId).toBe("label_ops");
    expect(pending.labelStatus).toBe("DONE");
    expect(pending.normalizedDescription).toBe("ACME ORDER ES");

    const labelPatches = updates.filter(
      (entry) =>
        entry.entity === "item" &&
        entry.id === "item_pending" &&
        "labelId" in entry.patch,
    );
    expect(labelPatches).toHaveLength(1);
    expect(labelPatches[0]?.patch.labelId).toBe("label_ops");
  });
});
