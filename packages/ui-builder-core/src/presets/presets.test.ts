import { describe, expect, it } from "vitest";

import {
  createDefaultComponent,
  createEmptyLayout,
} from "../builder/mutations.js";
import { applyPresetSlots } from "./apply-preset-slots.js";
import {
  genericizeLayoutNode,
  GenericizeLayoutNodeError,
} from "./genericize-layout-node.js";
import { uiBuilderSlotToken } from "./types.js";

const definition = {
  name: "account",
  fields: {
    name: { type: "string" },
    balance: { type: "number" },
  },
};

describe("genericizeLayoutNode", () => {
  it("replaces field paths with slot tokens", () => {
    const base = createEmptyLayout(1);
    const column = base.root.columns[0];
    if (!column) {
      throw new Error("missing column");
    }
    const layout = {
      ...base,
      root: {
        ...base.root,
        columns: [
          {
            ...column,
            rows: [
              {
                type: "component" as const,
                id: "row-1",
                component: createDefaultComponent("text", "name"),
              },
            ],
          },
        ],
      },
    };

    const result = genericizeLayoutNode("layout-document", layout);
    expect(result.fieldSlots).toHaveLength(1);
    expect(result.fieldSlots[0]?.sourceHint).toBe("name");
    expect(JSON.stringify(result.template)).toContain(
      uiBuilderSlotToken(result.fieldSlots[0]!.id),
    );
  });

  it("rejects metric-kpi components", () => {
    const base = createEmptyLayout(1);
    const column = base.root.columns[0];
    if (!column) {
      throw new Error("missing column");
    }
    const layout = {
      ...base,
      root: {
        ...base.root,
        columns: [
          {
            ...column,
            rows: [
              {
                type: "component" as const,
                id: "row-1",
                component: {
                  kind: "metric-kpi" as const,
                  metricDefinitionId: "m1",
                  groupBindings: {},
                  dimensionBindings: {},
                },
              },
            ],
          },
        ],
      },
    };

    expect(() => genericizeLayoutNode("layout-document", layout)).toThrow(
      GenericizeLayoutNodeError,
    );
  });
});

describe("applyPresetSlots", () => {
  it("applies slot mappings and validates against the entity", () => {
    const base = createEmptyLayout(1);
    const column = base.root.columns[0];
    if (!column) {
      throw new Error("missing column");
    }
    const layout = {
      ...base,
      root: {
        ...base.root,
        columns: [
          {
            ...column,
            rows: [
              {
                type: "component" as const,
                id: "row-1",
                component: createDefaultComponent("text", "name"),
              },
            ],
          },
        ],
      },
    };

    const generic = genericizeLayoutNode("layout-document", layout);
    const result = applyPresetSlots(
      "layout-document",
      JSON.stringify(generic.template),
      generic.fieldSlots,
      { [generic.fieldSlots[0]!.id]: "balance" },
      { designSurface: "listItem", definition },
    );

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      root: {
        columns: [
          {
            rows: [
              {
                component: {
                  primary: { type: "field", path: "balance" },
                },
              },
            ],
          },
        ],
      },
    });
  });
});
