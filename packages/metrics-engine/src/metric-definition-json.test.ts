import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  computeCatalogReplacePlan,
  createMetricDefinitionEnvelope,
  createMetricDefinitionsCatalogEnvelope,
  listBackfillRelevantChangedFields,
  metricDefinitionNeedsBackfill,
  parseMetricDefinitionJson,
  parseMetricDefinitionsCatalogJson,
  toPortableMetricDefinition,
} from "./metric-definition-json.js";
import type { MetricDefinitionRecord } from "./types.js";

const baseRecord: MetricDefinitionRecord = {
  id: "metric_1",
  tenantId: "tenant_a",
  metricId: "total_principal",
  name: "Total principal",
  computationMode: "aggregated",
  sourceModel: "loan",
  filters: [],
  groupBy: [],
  dimensions: [],
  dateFieldGranularity: {},
  valueDisplayFormat: "currency",
  parameters: [],
  aggregations: [{ operation: "SUM", field: "principal" }],
  target: { collection: "metric_1", granularity: "dynamic" },
  version: 1,
  schemaVersionDependency: 0,
  fieldsDependency: ["principal"],
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const otherRecord: MetricDefinitionRecord = {
  ...baseRecord,
  id: "metric_2",
  metricId: "loan_count",
  name: "Loan count",
  aggregations: [{ operation: "COUNT" }],
  fieldsDependency: [],
  valueDisplayFormat: "number",
};

describe("metric-definition-json", () => {
  it("round-trips single metric envelopes", () => {
    const envelope = createMetricDefinitionEnvelope(
      toPortableMetricDefinition(baseRecord),
    );
    const parsed = parseMetricDefinitionJson(JSON.stringify(envelope, null, 2));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.name).toBe("Total principal");
    }
  });

  it("strips server metadata for portable catalog export", () => {
    const portable = toPortableMetricDefinition(baseRecord);
    expect(portable).not.toHaveProperty("id");
    expect(portable).not.toHaveProperty("tenantId");
    expect(portable).not.toHaveProperty("metricId");
    expect(portable).not.toHaveProperty("target");
    expect(portable.name).toBe("Total principal");
  });

  it("validates duplicate metric names in catalog", () => {
    const envelope = {
      kind: "metric-definitions-catalog" as const,
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      metricDefinitions: [
        toPortableMetricDefinition(baseRecord),
        toPortableMetricDefinition(baseRecord),
      ],
    };
    const parsed = parseMetricDefinitionsCatalogJson(JSON.stringify(envelope));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors[0]?.message).toContain("Total principal");
    }
  });

  it("computes catalog replace plan by metric name", () => {
    const imported = [
      {
        ...toPortableMetricDefinition(baseRecord),
        version: 2,
      },
      {
        ...toPortableMetricDefinition(baseRecord),
        name: "Average rate",
        aggregations: [{ operation: "AVG" as const, field: "rate" }],
        fieldsDependency: ["rate"],
        version: 1,
      },
    ];

    const plan = computeCatalogReplacePlan({
      existing: [baseRecord, otherRecord],
      imported,
    });

    expect(plan.counts).toEqual({ created: 1, updated: 1, deleted: 1 });
    expect(plan.toDelete.map((item) => item.name)).toEqual(["Loan count"]);
    expect(plan.toCreate.map((item) => item.name)).toEqual(["Average rate"]);
    expect(plan.toUpdate[0]?.existing.name).toBe("Total principal");
  });

  it("detects backfill-relevant field changes", () => {
    const changed = listBackfillRelevantChangedFields({
      existing: baseRecord,
      imported: {
        ...toPortableMetricDefinition(baseRecord),
        aggregations: [{ operation: "SUM", field: "amount" }],
        fieldsDependency: ["amount"],
      },
    });
    expect(changed).toContain("aggregations");
    expect(changed).toContain("fieldsDependency");
    expect(
      metricDefinitionNeedsBackfill({
        existing: baseRecord,
        imported: toPortableMetricDefinition(baseRecord),
      }),
    ).toBe(false);
  });

  it("includes metrics in catalog envelope export", () => {
    const envelope = createMetricDefinitionsCatalogEnvelope([baseRecord]);
    expect(envelope.metricDefinitions).toHaveLength(1);
    expect(envelope.metricDefinitions[0]?.name).toBe("Total principal");
  });

  it("parses rates metric definitions catalog", () => {
    const catalogPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../apps/api/src/admin/rates-tenant/catalogs/rates-metric-definitions.json",
    );
    const text = readFileSync(catalogPath, "utf8");
    const parsed = parseMetricDefinitionsCatalogJson(text);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        parsed.errors
          .map((error) => `${error.path}: ${error.message}`)
          .join("\n"),
      );
    }

    expect(parsed.data.metricDefinitions.length).toBe(35);
    expect(
      parsed.data.metricDefinitions.some(
        (metric) => metric.sourceModel === "financialItem",
      ),
    ).toBe(true);
    expect(
      parsed.data.metricDefinitions.some(
        (metric) => metric.sourceModel === "paymentSchedule",
      ),
    ).toBe(true);
  });
});
