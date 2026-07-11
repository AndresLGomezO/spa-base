import { describe, expect, it } from "vitest";

import { uiLayoutDocumentSchema } from "./ui-layout-schema.js";

describe("conditionalStyleRuleSchema activePath", () => {
  it("accepts conditionKind activePath on container conditionalStyles", () => {
    const layout = {
      root: {
        type: "root",
        id: "root-1",
        columnCount: 1,
        columns: [
          {
            id: "col-1",
            rows: [
              {
                type: "component",
                id: "row-1",
                component: {
                  kind: "container",
                  stackDirection: "column",
                  rows: [],
                  conditionalStyles: [
                    {
                      conditionKind: "activePath",
                      matchValue: "/app/transactions",
                      styles: [{ property: "color", value: "primary" }],
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    expect(() => uiLayoutDocumentSchema.parse(layout)).not.toThrow();
  });

  it("rejects unknown conditionKind", () => {
    const layout = {
      root: {
        type: "root",
        id: "root-1",
        columnCount: 1,
        columns: [
          {
            id: "col-1",
            rows: [
              {
                type: "component",
                id: "row-1",
                component: {
                  kind: "container",
                  stackDirection: "column",
                  rows: [],
                  conditionalStyles: [
                    {
                      conditionKind: "viewport",
                      matchValue: "md",
                      styles: [{ property: "color", value: "primary" }],
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    expect(() => uiLayoutDocumentSchema.parse(layout)).toThrow();
  });
});
