import { describe, expect, it } from "vitest";

import {
  computeCatalogReplacePlan,
  createChartDefinitionEnvelope,
  createChartDefinitionsCatalogEnvelope,
  parseChartDefinitionJson,
  parseChartDefinitionsCatalogJson,
  toPortableChartDefinition,
} from "./chart-definition-json.js";
import type { ChartDefinitionRecord } from "./types.js";

const baseRecord: ChartDefinitionRecord = {
  id: "chart_1",
  tenantId: "tenant_a",
  chartId: "income_trend_chart",
  name: "Income trend chart",
  chartType: "area",
  displayMode: "overlay",
  dataSource: {
    type: "entityQuery",
    entityQueryDefinitionId: "Transaction trend",
    xFieldPath: "date",
    yFieldPath: "amount",
    timeSeries: {
      periodParameter: "period",
      bucketCount: 12,
      step: { unit: "month", offsetStart: -11, offsetEnd: 0 },
      aggregate: "sum",
      rowFilters: [
        {
          whenField: "type",
          whenOperator: "==",
          whenValue: "INCOME",
        },
      ],
    },
  },
  series: [{ id: "default", label: "Income" }],
  status: "ACTIVE",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("chart-definition-json", () => {
  it("round-trips single chart envelopes", () => {
    const envelope = createChartDefinitionEnvelope(
      toPortableChartDefinition(baseRecord),
    );
    const parsed = parseChartDefinitionJson(JSON.stringify(envelope, null, 2));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.name).toBe("Income trend chart");
    }
  });

  it("strips server metadata for portable catalog export", () => {
    const portable = toPortableChartDefinition(baseRecord);
    expect(portable).not.toHaveProperty("id");
    expect(portable).not.toHaveProperty("chartId");
    expect(portable.name).toBe("Income trend chart");
  });

  it("validates duplicate chart names in catalog", () => {
    const envelope = {
      kind: "chart-definitions-catalog" as const,
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      chartDefinitions: [
        toPortableChartDefinition(baseRecord),
        toPortableChartDefinition(baseRecord),
      ],
    };
    const parsed = parseChartDefinitionsCatalogJson(JSON.stringify(envelope));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors[0]?.message).toContain("Income trend chart");
    }
  });

  it("computes catalog replace plan by name", () => {
    const plan = computeCatalogReplacePlan({
      existing: [baseRecord],
      imported: [
        {
          ...toPortableChartDefinition(baseRecord),
          chartType: "line",
        },
        {
          name: "Expenses trend chart",
          chartType: "area",
          dataSource: {
            type: "static",
            points: [],
          },
          status: "ACTIVE",
        },
      ],
    });

    expect(plan.counts.updated).toBe(1);
    expect(plan.counts.created).toBe(1);
    expect(plan.counts.deleted).toBe(0);
  });

  it("exports catalog envelopes", () => {
    const envelope = createChartDefinitionsCatalogEnvelope([baseRecord]);
    expect(envelope.chartDefinitions).toHaveLength(1);
    expect(envelope.kind).toBe("chart-definitions-catalog");
  });

  it("parses donut chart definitions with metricValue source", () => {
    const parsed = parseChartDefinitionJson(
      JSON.stringify(
        createChartDefinitionEnvelope({
          name: "Budget status donut",
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
            showCenterLabel: true,
          },
          status: "ACTIVE",
        }),
      ),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.data.chartType).toBe("donut");
    expect(parsed.data.dataSource.type).toBe("metricValue");
    if (parsed.data.dataSource.type === "metricValue") {
      expect(parsed.data.dataSource.maxValue).toBe(100);
    }
  });
});
