import { describe, expect, it } from "vitest";

import {
  formatComputationPreview,
  formatParametersPreview,
} from "./MetricComputationPreview";

describe("MetricComputationPreview formatting", () => {
  it("formats parameters with deriveFrom", () => {
    const preview = formatParametersPreview(
      [
        {
          name: "currentPeriod",
          valueType: "dateBucket",
          granularity: "month",
        },
        {
          name: "comparisonPeriod",
          valueType: "dateBucket",
          granularity: "month",
          deriveFrom: {
            parameter: "currentPeriod",
            shift: { unit: "month", offset: -1 },
          },
        },
      ],
      {
        none: "(none)",
        deriveFrom: "derive from",
        shift: "shift",
      },
    );

    expect(preview).toContain("currentPeriod: dateBucket(month)");
    expect(preview).toContain(
      "comparisonPeriod: dateBucket(month), derive from currentPeriod, shift -1 month",
    );
  });

  it("formats percentChange computation preview", () => {
    const preview = formatComputationPreview(
      {
        type: "percentChange",
        current: {
          type: "metricRef",
          metricDefinitionId: "metric_a",
          parameterMap: { period: "currentPeriod" },
        },
        baseline: {
          type: "metricRef",
          metricDefinitionId: "metric_a",
          parameterMap: { period: "comparisonPeriod" },
        },
      },
      (id) => (id === "metric_a" ? "Net Balance by Month" : id),
      () => "?",
      {
        current: "current",
        baseline: "baseline",
        numerator: "numerator",
        denominator: "denominator",
        percentChange: "percentChange",
        difference: "difference",
        ratio: "ratio",
        expression: "expression",
        inputs: "inputs",
      },
    );

    expect(preview).toContain("percentChange(");
    expect(preview).toContain("metric(Net Balance by Month");
    expect(preview).toContain("period → currentPeriod");
    expect(preview).toContain("period → comparisonPeriod");
  });
});
