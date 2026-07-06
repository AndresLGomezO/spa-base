import { describe, expect, it } from "vitest";

import {
  resolveChartDefinitionDocumentId,
  resolveChartDefinitionRecord,
} from "./resolve-chart-definition-reference.js";
import type { ChartDefinitionRecord } from "./api-client.js";

const definitions: ChartDefinitionRecord[] = [
  {
    id: "chart_doc_1",
    tenantId: "tenant_a",
    chartId: "income_trend_chart",
    name: "Income trend chart",
    chartType: "area",
    dataSource: {
      type: "static",
      points: [],
    },
    status: "ACTIVE",
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("resolve-chart-definition-reference", () => {
  it("resolves by document id", () => {
    expect(resolveChartDefinitionDocumentId("chart_doc_1", definitions)).toBe(
      "chart_doc_1",
    );
  });

  it("resolves by chartId slug", () => {
    expect(
      resolveChartDefinitionDocumentId("income_trend_chart", definitions),
    ).toBe("chart_doc_1");
  });

  it("resolves by display name", () => {
    expect(
      resolveChartDefinitionDocumentId("Income trend chart", definitions),
    ).toBe("chart_doc_1");
  });

  it("returns record by name reference", () => {
    expect(
      resolveChartDefinitionRecord("Income trend chart", definitions)?.id,
    ).toBe("chart_doc_1");
  });
});
