import { describe, expect, it } from "vitest";

import {
  barChartLegendKey,
  barChartValueUnitKey,
  timelineChartLegendKey,
  timelineChartValueUnitKey,
} from "./debugger-chart-labels";

describe("debugger-chart-labels", () => {
  it("maps bar chart ids to unit and legend keys", () => {
    expect(
      barChartValueUnitKey({
        id: "entities-by-writes",
        titleKey: "debugger.summary.writesByEntity",
        groups: [],
      }),
    ).toBe("debugger.chart.unit.writes");
    expect(
      barChartLegendKey({
        id: "hooks-by-duration",
        titleKey: "debugger.summary.topHooksByDuration",
        groups: [],
      }),
    ).toBe("debugger.chart.legend.topHooksByDuration");
  });

  it("maps timeline units by source", () => {
    expect(timelineChartValueUnitKey("requestPerf")).toBe(
      "debugger.chart.unit.requests",
    );
    expect(timelineChartValueUnitKey("hookExecution")).toBe(
      "debugger.chart.unit.executions",
    );
    expect(timelineChartLegendKey()).toBe("debugger.chart.legend.timeline");
  });
});
