import { describe, expect, it } from "vitest";

import {
  buildEntityQueryDefinitionRecord,
  mergeEntityQueryDefinitionPatch,
} from "./build-entity-query-definition-record.js";

const TOP_OUTFLOW_INPUT = {
  name: "Top outflow category (period)",
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
  sort: [],
  groupBy: ["categoryId"],
  aggregations: [{ operation: "SUM" as const, field: "amount" }],
  groupSort: [{ field: "sum_amount", direction: "desc" as const }],
  groupLimit: 1,
  limitMode: "all" as const,
  limit: 20,
  status: "ACTIVE" as const,
};

describe("buildEntityQueryDefinitionRecord", () => {
  it("persists aggregated query fields on create", () => {
    const record = buildEntityQueryDefinitionRecord(
      {
        id: "entity_query_test",
        tenantId: "tenant_a",
        queryId: "top_outflow_category_period",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      TOP_OUTFLOW_INPUT,
    );

    expect(record.queryMode).toBe("aggregated");
    expect(record.groupBy).toEqual(["categoryId"]);
    expect(record.aggregations).toEqual([
      { operation: "SUM", field: "amount" },
    ]);
    expect(record.groupLimit).toBe(1);
  });
});

describe("mergeEntityQueryDefinitionPatch", () => {
  it("persists aggregated query fields on update", () => {
    const current = buildEntityQueryDefinitionRecord(
      {
        id: "entity_query_test",
        tenantId: "tenant_a",
        queryId: "top_outflow_category_period",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        ...TOP_OUTFLOW_INPUT,
        queryMode: "records",
        groupBy: [],
        aggregations: [],
        groupSort: [],
        groupLimit: undefined,
        limitMode: "topN",
        limit: 20,
      },
    );

    const next = mergeEntityQueryDefinitionPatch(
      current,
      {
        queryMode: "aggregated",
        groupBy: ["categoryId"],
        aggregations: [{ operation: "SUM", field: "amount" }],
        groupSort: [{ field: "sum_amount", direction: "desc" }],
        groupLimit: 1,
        limitMode: "all",
      },
      "2026-01-02T00:00:00.000Z",
    );

    expect(next.queryMode).toBe("aggregated");
    expect(next.groupBy).toEqual(["categoryId"]);
    expect(next.groupLimit).toBe(1);
    expect(next.limitMode).toBe("all");
  });
});
