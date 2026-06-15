import { describe, expect, it } from "vitest";

import { componentRowSchema } from "./ui-layout-schema.js";
import type { ComponentRowNode } from "../types/layout.js";

describe("componentRowSchema metric-widget", () => {
  it("parses metric-widget component rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-1",
      component: {
        kind: "metric-widget",
        entityName: "account",
        widgetId: "widget-1",
      },
    }) as ComponentRowNode;

    expect(parsed.component).toEqual({
      kind: "metric-widget",
      entityName: "account",
      widgetId: "widget-1",
    });
  });
});
