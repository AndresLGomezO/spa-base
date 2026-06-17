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

  it("parses unconfigured metric-kpi component rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-2",
      component: {
        kind: "metric-kpi",
        metricDefinitionId: "",
        groupBindings: {},
        dimensionBindings: {},
      },
    }) as ComponentRowNode;

    expect(parsed.component).toEqual({
      kind: "metric-kpi",
      metricDefinitionId: "",
      groupBindings: {},
      dimensionBindings: {},
    });
  });

  it("parses metric-derived-kpi expression component rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-3",
      component: {
        kind: "metric-derived-kpi",
        label: "Total balance",
        expression: [
          { type: "metric", metricDefinitionId: "income" },
          { type: "operator", op: "-" },
          { type: "metric", metricDefinitionId: "outflows" },
        ],
        groupBindings: { date: { type: "static", value: "2025-09" } },
        dimensionBindings: {},
      },
    }) as ComponentRowNode;

    expect(parsed.component).toEqual({
      kind: "metric-derived-kpi",
      label: "Total balance",
      expression: [
        { type: "metric", metricDefinitionId: "income" },
        { type: "operator", op: "-" },
        { type: "metric", metricDefinitionId: "outflows" },
      ],
      groupBindings: { date: { type: "static", value: "2025-09" } },
      dimensionBindings: {},
      styles: undefined,
    });
  });

  it("migrates legacy metric-derived-kpi terms into expression", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-4",
      component: {
        kind: "metric-derived-kpi",
        label: "Total balance",
        terms: [
          { metricDefinitionId: "income", multiplier: 1 },
          { metricDefinitionId: "outflows", multiplier: -1 },
        ],
        groupBindings: { date: { type: "static", value: "2025-09" } },
        dimensionBindings: {},
      },
    }) as ComponentRowNode;

    expect(parsed.component).toEqual({
      kind: "metric-derived-kpi",
      label: "Total balance",
      expression: [
        { type: "metric", metricDefinitionId: "income" },
        { type: "operator", op: "-" },
        { type: "metric", metricDefinitionId: "outflows" },
      ],
      groupBindings: { date: { type: "static", value: "2025-09" } },
      dimensionBindings: {},
      styles: undefined,
    });
  });
});
