import { describe, expect, it } from "vitest";

import { componentRowSchema } from "./ui-layout-schema.js";
import type { ComponentRowNode } from "../types/layout.js";

describe("componentRowSchema query-viewer", () => {
  it("parses query-viewer component rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-1",
      component: {
        kind: "query-viewer",
        entityQueryDefinitionId: "query-def-1",
        rows: [],
      },
    }) as ComponentRowNode;

    expect(parsed.component).toEqual({
      kind: "query-viewer",
      entityQueryDefinitionId: "query-def-1",
      rows: [],
    });
  });

  it("parses query-viewer rows with item template children", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-1",
      component: {
        kind: "query-viewer",
        entityQueryDefinitionId: "query-def-1",
        stackDirection: "row",
        rows: [
          {
            type: "component",
            id: "row-template-text",
            component: {
              kind: "text",
              primary: { type: "field", path: "name" },
            },
          },
        ],
      },
    }) as ComponentRowNode;

    expect(parsed.component.kind).toBe("query-viewer");
    if (parsed.component.kind !== "query-viewer") {
      throw new Error("Expected query-viewer component");
    }

    expect(parsed.component.stackDirection).toBe("row");
    expect(parsed.component.rows).toHaveLength(1);
  });
});
