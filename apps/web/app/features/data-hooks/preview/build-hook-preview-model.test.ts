import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseDataHooksCatalogJson } from "@repo/hooks";

import { buildHookPreviewModel } from "./build-hook-preview-model.js";
import type { HookPreviewBuildContext } from "./hook-preview-types.js";

const ratesCatalogPath = resolve(
  import.meta.dirname,
  "../../../../../api/src/admin/rates-tenant/catalogs/rates-data-hooks.json",
);

function mockContext(
  overrides: Partial<HookPreviewBuildContext> = {},
): HookPreviewBuildContext {
  const t = (key: string, options?: Record<string, unknown>) => {
    if (options) {
      return `${key}:${JSON.stringify(options)}`;
    }
    return key;
  };
  return {
    entityName: "financialItem",
    entityLabel: (name) => name,
    fieldLabel: (_entity, field) => field,
    t,
    ...overrides,
  };
}

function loadRatesHook(name: string) {
  const parsed = parseDataHooksCatalogJson(
    readFileSync(ratesCatalogPath, "utf8"),
  );
  if (!parsed.ok) {
    throw new Error("Failed to parse rates hooks catalog");
  }
  const hook = parsed.data.dataHooks.find((entry) => entry.name === name);
  if (!hook) {
    throw new Error(`Hook not found: ${name}`);
  }
  return hook;
}

describe("buildHookPreviewModel", () => {
  it("builds a story flow for set pending status cookbook hook", () => {
    const model = buildHookPreviewModel(
      {
        name: "Set pending status",
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
      },
      mockContext({ entityName: "loan" }),
    );

    expect(model.steps.map((step) => step.kind)).toEqual(["trigger", "action"]);
    expect(model.steps[0]?.summary).toBe(
      'dataHooks.preview.trigger.crud.create.before:{"entity":"loan"}',
    );
    expect(model.steps[1]?.summary).toContain(
      "dataHooks.preview.actions.setField",
    );
  });

  it("builds condition bullets for grouped conditions", () => {
    const model = buildHookPreviewModel(
      {
        name: "Complete when funded",
        entity: "loan",
        phase: "before",
        trigger: { operation: "create" },
        condition: {
          type: "group",
          combinator: "and",
          children: [
            {
              type: "condition",
              field: "amount",
              operator: ">=",
              value: {
                kind: "field",
                source: "current",
                path: "commitmentAmount",
              },
            },
          ],
        },
        actions: [
          {
            type: "setField",
            field: "status",
            value: { kind: "literal", value: "COMPLETE" },
          },
        ],
        enabled: true,
      },
      mockContext({ entityName: "loan" }),
    );

    expect(model.steps.map((step) => step.kind)).toEqual([
      "trigger",
      "condition",
      "action",
    ]);
    expect(model.steps[1]?.bullets?.length).toBeGreaterThan(0);
  });

  it("humanizes create initial schedule row without raw formula DSL in overview", () => {
    const hook = loadRatesHook("Create initial schedule row");
    const model = buildHookPreviewModel(
      {
        name: hook.name,
        description: hook.description,
        entity: hook.entity,
        phase: hook.phase ?? "after",
        trigger: hook.trigger,
        condition: hook.condition ?? null,
        actions: hook.actions,
        enabled: hook.enabled ?? true,
      },
      mockContext(),
    );

    expect(model.steps.map((step) => step.kind)).toEqual([
      "trigger",
      "condition",
      "action",
      "action",
      "action",
    ]);

    const createStep = model.steps.find((step) => step.icon === "loop");
    expect(createStep?.summary).toContain(
      "dataHooks.preview.formulas.recurringScheduleInitialRowCount",
    );
    expect(createStep?.summary).not.toContain("frequencyScheduleDueDate(");
    expect(createStep?.widgets?.some((w) => w.type === "frequencyTable")).toBe(
      true,
    );
    expect(createStep?.widgets?.some((w) => w.type === "loopExample")).toBe(
      true,
    );

    const notifyStep = model.steps.find((step) => step.icon === "notification");
    expect(notifyStep).toBeDefined();
  });
});
