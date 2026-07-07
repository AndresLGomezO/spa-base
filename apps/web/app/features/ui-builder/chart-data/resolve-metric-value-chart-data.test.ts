import { describe, expect, it } from "vitest";

import type { ResolvedChartComponentConfig } from "@repo/ui-builder-core";
import type { MetricDefinitionRecord } from "../../../lib/api-client.js";

import {
  buildPreviewDonutData,
  resolveDonutProgressValue,
} from "./resolve-metric-value-chart-data.js";

const donutConfig: ResolvedChartComponentConfig = {
  kind: "chart",
  chartDefinitionId: "budget-donut",
  chartType: "donut",
  dataSource: {
    type: "metricValue",
    metricDefinitionId: "Payment Progress %",
    maxValue: 100,
    parameterBindings: {
      period: { type: "dashboardDateFilter" },
    },
  },
  donut: {
    innerRadiusRatio: 0.72,
    fillColor: "var(--color-success)",
    trackColor: "color-mix(in oklch, var(--color-success) 20%, transparent)",
    showCenterLabel: true,
  },
};

const percentDefinition = {
  valueDisplayFormat: "percent",
} as MetricDefinitionRecord;

const numberDefinition = {
  valueDisplayFormat: "number",
} as MetricDefinitionRecord;

describe("buildPreviewDonutData", () => {
  it("builds preview donut data from chart config", () => {
    const preview = buildPreviewDonutData(donutConfig);
    expect(preview.maxValue).toBe(100);
    expect(preview.value).toBe(42);
    expect(preview.centerLabel).toBe("42%");
    expect(preview.fillColor).toBe("var(--color-success)");
    expect(preview.showCenterLabel).toBe(true);
  });
});

describe("resolveDonutProgressValue", () => {
  it("scales decimal ratio to arc points for percent metrics", () => {
    expect(resolveDonutProgressValue(0.3361, percentDefinition)).toBe(33.61);
  });

  it("leaves raw value unchanged for non-percent metrics", () => {
    expect(resolveDonutProgressValue(42, numberDefinition)).toBe(42);
  });
});
