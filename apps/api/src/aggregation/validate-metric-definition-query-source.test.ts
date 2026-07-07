import { describe, expect, it } from "vitest";

import { validateMetricQuerySourceEligibility } from "./validate-metric-definition-query-source.js";
import type { EntityQueryDefinitionRecord } from "@repo/entity-queries";

const baseQuery: EntityQueryDefinitionRecord = {
  id: "query_1",
  tenantId: "tenant_a",
  queryId: "all_transactions",
  name: "All transactions",
  sourceEntity: "transaction",
  queryMode: "records",
  parameters: [],
  filter: { type: "group", combinator: "and", children: [] },
  sort: [],
  groupBy: [],
  aggregations: [],
  groupSort: [],
  limitMode: "all",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("validateMetricQuerySourceEligibility", () => {
  it("accepts active unlimited queries with matching source entity", () => {
    expect(
      validateMetricQuerySourceEligibility(baseQuery, "transaction"),
    ).toBeNull();
  });

  it("rejects topN queries", () => {
    expect(
      validateMetricQuerySourceEligibility(
        { ...baseQuery, limitMode: "topN", limit: 10 },
        "transaction",
      ),
    ).toContain('limit mode "all"');
  });

  it("rejects paused queries", () => {
    expect(
      validateMetricQuerySourceEligibility(
        { ...baseQuery, status: "PAUSED" },
        "transaction",
      ),
    ).toContain("ACTIVE");
  });

  it("rejects aggregated queries", () => {
    expect(
      validateMetricQuerySourceEligibility(
        {
          ...baseQuery,
          queryMode: "aggregated",
          groupBy: ["categoryId"],
          aggregations: [{ operation: "SUM", field: "amount" }],
          groupSort: [{ field: "sum_amount", direction: "desc" }],
          groupLimit: 1,
        },
        "transaction",
      ),
    ).toContain("aggregated query mode");
  });

  it("rejects mismatched source entities", () => {
    expect(validateMetricQuerySourceEligibility(baseQuery, "loan")).toContain(
      "must match",
    );
  });
});
