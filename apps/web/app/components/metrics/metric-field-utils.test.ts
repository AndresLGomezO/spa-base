import { describe, expect, it } from "vitest";

import {
  buildMetricSummaryContext,
  canShowMetricSummary,
  formatSummaryExampleValues,
  listDateFieldsInKeys,
} from "./metric-field-utils";

describe("formatSummaryExampleValues", () => {
  it("includes avg fields for AVG operation", () => {
    expect(
      formatSummaryExampleValues("AVG", "amount", ["region"], []),
    ).toContain("avg_amount: 500");
    expect(
      formatSummaryExampleValues("AVG", "amount", ["region"], []),
    ).toContain("sum_amount: 1500");
  });
});

describe("canShowMetricSummary", () => {
  it("requires aggregation field for SUM", () => {
    expect(
      canShowMetricSummary({
        name: "Total",
        sourceModel: "loan",
        operation: "SUM",
        aggregationField: "",
      }),
    ).toBe(false);
  });

  it("allows COUNT without numeric field", () => {
    expect(
      canShowMetricSummary({
        name: "Count",
        sourceModel: "loan",
        operation: "COUNT",
        aggregationField: "",
      }),
    ).toBe(true);
  });
});

describe("buildMetricSummaryContext", () => {
  it("uses entity label when entity is provided", () => {
    const context = buildMetricSummaryContext({
      name: "Loan avg",
      description: "",
      sourceModel: "loan",
      entity: {
        name: "loan",
        label: "Loans",
        ui: { nav: { label: "Loans" } },
        fields: { amount: { type: "number", label: "Amount" } },
      } as never,
      operation: "AVG",
      aggregationField: "amount",
      fieldsDependency: ["amount"],
      groupBy: [],
      dimensions: [],
      dateFieldGranularity: {},
      valueDisplayFormat: "number",
      isCreate: true,
    });

    expect(context.sourceModelLabel).toBe("Loans");
  });
});

describe("listDateFieldsInKeys", () => {
  const entity = {
    name: "transaction",
    fields: {
      date: { type: "date" },
      categoryId: { type: "string" },
    },
    ui: {},
  } as never;

  it("returns only selected date fields", () => {
    expect(listDateFieldsInKeys(entity, ["date", "categoryId"], [])).toEqual([
      "date",
    ]);
    expect(listDateFieldsInKeys(entity, ["categoryId"], [])).toEqual([]);
  });
});
