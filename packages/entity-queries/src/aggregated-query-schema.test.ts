import { describe, expect, it } from "vitest";

import { createEntityQueryDefinitionInputSchema } from "./types.js";

describe("aggregated entity query schema", () => {
  const baseAggregatedQuery = {
    name: "Top category",
    sourceEntity: "transaction",
    queryMode: "aggregated" as const,
    parameters: [
      {
        name: "period",
        valueType: "dateBucket" as const,
        granularity: "month" as const,
        field: "date",
      },
    ],
    filter: {
      type: "group" as const,
      combinator: "and" as const,
      children: [
        {
          type: "condition" as const,
          field: "date",
          operator: ">=" as const,
          value: {
            type: "parameter" as const,
            name: "period",
            bound: "start" as const,
          },
        },
      ],
    },
    groupBy: ["categoryId"],
    aggregations: [{ operation: "SUM" as const, field: "amount" }],
    groupSort: [{ field: "sum_amount", direction: "desc" as const }],
    groupLimit: 1,
    limitMode: "all" as const,
    status: "ACTIVE" as const,
  };

  it("accepts valid aggregated queries", () => {
    const parsed =
      createEntityQueryDefinitionInputSchema.safeParse(baseAggregatedQuery);
    expect(parsed.success).toBe(true);
  });

  it("rejects aggregated queries without groupBy", () => {
    const parsed = createEntityQueryDefinitionInputSchema.safeParse({
      ...baseAggregatedQuery,
      groupBy: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects aggregated queries with topN limit mode", () => {
    const parsed = createEntityQueryDefinitionInputSchema.safeParse({
      ...baseAggregatedQuery,
      limitMode: "topN",
      limit: 10,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects record sort on aggregated queries", () => {
    const parsed = createEntityQueryDefinitionInputSchema.safeParse({
      ...baseAggregatedQuery,
      sort: [{ field: "date", direction: "desc" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects aggregation fields on record queries", () => {
    const parsed = createEntityQueryDefinitionInputSchema.safeParse({
      name: "Rows",
      sourceEntity: "transaction",
      queryMode: "records",
      filter: {
        type: "group",
        combinator: "and",
        children: [],
      },
      groupBy: ["categoryId"],
      aggregations: [{ operation: "SUM", field: "amount" }],
      limitMode: "topN",
      limit: 10,
      status: "ACTIVE",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid groupSort fields", () => {
    const parsed = createEntityQueryDefinitionInputSchema.safeParse({
      ...baseAggregatedQuery,
      groupSort: [{ field: "unknown_field", direction: "desc" }],
    });
    expect(parsed.success).toBe(false);
  });
});
