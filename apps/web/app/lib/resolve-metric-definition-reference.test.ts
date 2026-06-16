import { describe, expect, it } from "vitest";

import type { MetricDefinitionRecord } from "./api-client.js";
import {
  formatMetricDefinitionOptionLabel,
  resolveMetricDefinitionDocumentId,
} from "./resolve-metric-definition-reference.js";

function metric(
  overrides: Partial<MetricDefinitionRecord> &
    Pick<MetricDefinitionRecord, "id" | "name">,
): MetricDefinitionRecord {
  return {
    tenantId: "tenant_a",
    metricId: overrides.id,
    description: "",
    sourceModel: "account",
    filters: [],
    groupBy: [],
    dimensions: [],
    dateFieldGranularity: {},
    valueDisplayFormat: "number",
    aggregations: [{ operation: "SUM", field: "balance" }],
    target: { collection: overrides.id, granularity: "dynamic" },
    version: 1,
    schemaVersionDependency: 1,
    fieldsDependency: ["balance"],
    status: "ACTIVE",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("resolveMetricDefinitionDocumentId", () => {
  const definitions = [
    metric({
      id: "doc_account_balances",
      metricId: "total_account_balances",
      name: "Total Account Balances",
      sourceModel: "account",
    }),
    metric({
      id: "doc_subscriptions",
      metricId: "number_of_active_subscriptions",
      name: "Number of Active Subscriptions",
      sourceModel: "contract",
    }),
  ];

  it("returns undefined for blank ids", () => {
    expect(resolveMetricDefinitionDocumentId("", definitions)).toBeUndefined();
    expect(
      resolveMetricDefinitionDocumentId("   ", definitions),
    ).toBeUndefined();
  });

  it("resolves document ids", () => {
    expect(
      resolveMetricDefinitionDocumentId("doc_account_balances", definitions),
    ).toBe("doc_account_balances");
  });

  it("resolves metricId slugs", () => {
    expect(
      resolveMetricDefinitionDocumentId("total_account_balances", definitions),
    ).toBe("doc_account_balances");
  });

  it("resolves metric display names", () => {
    expect(
      resolveMetricDefinitionDocumentId("Total Account Balances", definitions),
    ).toBe("doc_account_balances");
  });

  it("falls back to the configured value when no catalog match exists", () => {
    expect(
      resolveMetricDefinitionDocumentId("legacy_metric_id", definitions),
    ).toBe("legacy_metric_id");
  });
});

describe("formatMetricDefinitionOptionLabel", () => {
  it("includes the source model", () => {
    expect(
      formatMetricDefinitionOptionLabel(
        metric({
          id: "doc_1",
          name: "Total Account Balances",
          sourceModel: "account",
        }),
      ),
    ).toBe("Total Account Balances (account)");
  });
});
