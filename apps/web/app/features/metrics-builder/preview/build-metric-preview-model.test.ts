import { describe, expect, it } from "vitest";

import type { MetricDefinitionDraft } from "../../../components/metrics/metric-definition-draft.js";
import { createDefaultComputedComputation } from "../../../components/metrics/metric-definition-draft.js";
import { buildMetricPreviewModel } from "./build-metric-preview-model.js";
import type { MetricPreviewBuildContext } from "./metric-preview-types.js";

function mockContext(
  overrides: Partial<MetricPreviewBuildContext> = {},
): MetricPreviewBuildContext {
  const t = (key: string, options?: Record<string, unknown>) => {
    if (options) {
      return `${key}:${JSON.stringify(options)}`;
    }
    return key;
  };
  return {
    entityLabel: (name) => name,
    fieldLabel: (_entity, field) => field,
    queryLabel: (id) => id,
    metricLabel: (id) => id,
    t,
    ...overrides,
  };
}

const aggregatedDraft: MetricDefinitionDraft = {
  name: "Total revenue",
  description: "Sum of paid amounts",
  computationMode: "aggregated",
  sourceType: "entity",
  sourceModel: "payment",
  sourceQueryDefinitionId: "",
  status: "ACTIVE",
  aggregationOperation: "SUM",
  aggregationField: "amount",
  fieldsDependency: ["amount"],
  filterRows: [
    {
      id: "filter-1",
      field: "status",
      op: "eq",
      scalarValue: "PAID",
      listValues: [],
    },
  ],
  groupBy: ["category"],
  dimensions: [],
  dateFieldGranularity: {},
  parameters: [],
  computation: undefined,
  valueDisplayFormat: "currency",
  version: 1,
  schemaVersionDependency: 1,
};

const computedDraft: MetricDefinitionDraft = {
  ...aggregatedDraft,
  computationMode: "computed",
  parameters: [
    { name: "currentMonth", valueType: "dateBucket", granularity: "month" },
  ],
  computation: createDefaultComputedComputation(),
};

describe("buildMetricPreviewModel", () => {
  it("builds aggregated metric flow steps", () => {
    const model = buildMetricPreviewModel(
      {
        name: "Total revenue",
        description: "Sum of paid amounts",
        draft: aggregatedDraft,
        status: "ACTIVE",
      },
      mockContext(),
    );

    expect(model.mode).toBe("aggregated");
    expect(model.steps.map((step) => step.kind)).toEqual([
      "source",
      "filter",
      "aggregate",
      "output",
    ]);
    expect(model.steps[0]?.summary).toContain(
      "metrics.preview.aggregated.sourceEntity",
    );
    expect(model.steps[1]?.bullets?.[0]).toContain(
      "metrics.preview.filters.eq",
    );
    expect(model.metaChips).toContain("metrics.workbench.list.modeAggregated");
  });

  it("builds computed metric flow steps", () => {
    const model = buildMetricPreviewModel(
      {
        name: "Revenue change",
        draft: computedDraft,
        status: "ACTIVE",
      },
      mockContext(),
    );

    expect(model.mode).toBe("computed");
    expect(model.steps.map((step) => step.kind)).toEqual([
      "parameters",
      "computation",
      "output",
    ]);
    expect(model.steps[0]?.summary).toContain(
      "metrics.preview.computed.parametersSummary",
    );
    expect(model.steps[1]?.summary).toBe(
      "metrics.preview.computed.computation.percentChange",
    );
  });
});
