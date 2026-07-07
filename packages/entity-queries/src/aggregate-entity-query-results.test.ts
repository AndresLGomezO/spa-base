import { describe, expect, it } from "vitest";

import {
  aggregateEntityQueryResults,
  listEntityQueryAggregationOutputFields,
} from "./aggregate-entity-query-results.js";

describe("aggregateEntityQueryResults", () => {
  const records = [
    { categoryId: "food", amount: 100, date: "2026-06-01" },
    { categoryId: "food", amount: 50, date: "2026-06-02" },
    { categoryId: "travel", amount: 200, date: "2026-06-03" },
    { categoryId: "travel", amount: 25, date: "2026-06-04" },
  ];

  it("groups and sums by categoryId", () => {
    const rows = aggregateEntityQueryResults(records, {
      groupBy: ["categoryId"],
      aggregations: [{ operation: "SUM", field: "amount" }],
      groupSort: [{ field: "sum_amount", direction: "desc" }],
    });

    expect(rows).toEqual([
      { categoryId: "travel", sum_amount: 225 },
      { categoryId: "food", sum_amount: 150 },
    ]);
  });

  it("applies groupLimit after sorting", () => {
    const rows = aggregateEntityQueryResults(records, {
      groupBy: ["categoryId"],
      aggregations: [{ operation: "SUM", field: "amount" }],
      groupSort: [{ field: "sum_amount", direction: "desc" }],
      groupLimit: 1,
    });

    expect(rows).toEqual([{ categoryId: "travel", sum_amount: 225 }]);
  });

  it("supports multi-field groupBy", () => {
    const rows = aggregateEntityQueryResults(records, {
      groupBy: ["categoryId", "date"],
      aggregations: [{ operation: "SUM", field: "amount" }],
      groupSort: [{ field: "date", direction: "asc" }],
    });

    expect(rows).toEqual([
      { categoryId: "food", date: "2026-06-01", sum_amount: 100 },
      { categoryId: "food", date: "2026-06-02", sum_amount: 50 },
      { categoryId: "travel", date: "2026-06-03", sum_amount: 200 },
      { categoryId: "travel", date: "2026-06-04", sum_amount: 25 },
    ]);
  });

  it("computes count and average aggregations", () => {
    const rows = aggregateEntityQueryResults(records, {
      groupBy: ["categoryId"],
      aggregations: [
        { operation: "COUNT" },
        { operation: "AVG", field: "amount" },
      ],
      groupSort: [{ field: "categoryId", direction: "asc" }],
    });

    expect(rows).toEqual([
      { categoryId: "food", count: 2, avg_amount: 75 },
      { categoryId: "travel", count: 2, avg_amount: 112.5 },
    ]);
  });

  it("returns empty array when no records match", () => {
    expect(
      aggregateEntityQueryResults([], {
        groupBy: ["categoryId"],
        aggregations: [{ operation: "SUM", field: "amount" }],
        groupSort: [],
      }),
    ).toEqual([]);
  });

  it("groups nullish values into the same bucket", () => {
    const rows = aggregateEntityQueryResults(
      [
        { categoryId: null, amount: 10 },
        { categoryId: undefined, amount: 20 },
      ],
      {
        groupBy: ["categoryId"],
        aggregations: [{ operation: "SUM", field: "amount" }],
        groupSort: [],
      },
    );

    expect(rows).toEqual([{ categoryId: null, sum_amount: 30 }]);
  });
});

describe("listEntityQueryAggregationOutputFields", () => {
  it("lists group keys and aggregation aliases", () => {
    expect(
      listEntityQueryAggregationOutputFields({
        groupBy: ["categoryId"],
        aggregations: [
          { operation: "SUM", field: "amount" },
          { operation: "COUNT" },
        ],
      }),
    ).toEqual(["categoryId", "sum_amount", "count"]);
  });
});
