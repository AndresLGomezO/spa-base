import { describe, expect, it } from "vitest";

import {
  buildMetricSummaryContext,
  canShowMetricSummary,
  collectFilterFieldNames,
  formatMetricFiltersSummary,
  formatSummaryExampleValues,
  listDateFieldsInKeys,
  mergeFieldsDependencyWithFilters,
  metricFiltersToEditorRows,
  normalizeMetricFiltersForSave,
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
      filters: [],
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

describe("normalizeMetricFiltersForSave", () => {
  const transactionEntity = {
    name: "transaction",
    fields: {
      type: { type: "enum", enumValues: ["INCOME", "EXPENSE", "PAYMENT"] },
      amount: { type: "number" },
    },
    ui: {},
  } as never;

  it("normalizes enum eq filter", () => {
    const result = normalizeMetricFiltersForSave(
      [
        {
          id: "1",
          field: "type",
          op: "eq",
          scalarValue: "INCOME",
          listValues: [],
        },
      ],
      transactionEntity,
    );

    expect(result).toEqual({
      filters: [{ field: "type", op: "eq", value: "INCOME" }],
    });
  });

  it("normalizes enum in filter", () => {
    const result = normalizeMetricFiltersForSave(
      [
        {
          id: "1",
          field: "type",
          op: "in",
          scalarValue: "",
          listValues: ["EXPENSE", "PAYMENT"],
        },
      ],
      transactionEntity,
    );

    expect(result).toEqual({
      filters: [
        {
          field: "type",
          op: "in",
          value: ["EXPENSE", "PAYMENT"],
        },
      ],
    });
  });

  it("rejects invalid enum value", () => {
    const result = normalizeMetricFiltersForSave(
      [
        {
          id: "1",
          field: "type",
          op: "eq",
          scalarValue: "INVALID",
          listValues: [],
        },
      ],
      transactionEntity,
    );

    expect(result).toEqual({ error: "type" });
  });
});

describe("mergeFieldsDependencyWithFilters", () => {
  it("adds filter fields to dependencies", () => {
    expect(
      mergeFieldsDependencyWithFilters(
        ["amount"],
        [{ field: "type", op: "eq", value: "INCOME" }],
      ),
    ).toEqual(["amount", "type"]);
  });
});

describe("metricFiltersToEditorRows", () => {
  it("round-trips saved filters into editor rows", () => {
    const rows = metricFiltersToEditorRows([
      { field: "type", op: "eq", value: "INCOME" },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.field).toBe("type");
    expect(rows[0]?.scalarValue).toBe("INCOME");
  });
});

describe("formatMetricFiltersSummary", () => {
  it("formats eq and in filters", () => {
    const summary = formatMetricFiltersSummary(
      [
        { field: "type", op: "eq", value: "INCOME" },
        { field: "type", op: "in", value: ["EXPENSE", "PAYMENT"] },
      ],
      {
        name: "transaction",
        fields: {
          type: { type: "enum", enumValues: ["INCOME", "EXPENSE", "PAYMENT"] },
        },
        ui: { fields: { type: { label: "Type" } } },
      } as never,
    );

    expect(summary).toContain("Type = INCOME");
    expect(summary).toContain("Type in [EXPENSE, PAYMENT]");
  });
});

describe("collectFilterFieldNames", () => {
  it("returns unique filter field names", () => {
    expect(
      collectFilterFieldNames([
        { field: "type", op: "eq", value: "INCOME" },
        { field: "type", op: "in", value: ["EXPENSE"] },
        { field: "status", op: "eq", value: "ACTIVE" },
      ]),
    ).toEqual(["type", "status"]);
  });
});
