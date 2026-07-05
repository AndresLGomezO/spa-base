import { describe, expect, it } from "vitest";

import {
  applyMetricSelectionToSearchParams,
  getMetricSelectionId,
  METRIC_SELECTION_SEARCH_PARAM,
  validateMetricDraftForSave,
} from "./use-metrics-editor";
import {
  createDefaultComputedComputation,
  type MetricDefinitionDraft,
} from "../../components/metrics/metric-definition-draft";

const baseDraft: MetricDefinitionDraft = {
  name: "Income MoM %",
  description: "",
  computationMode: "computed",
  sourceType: "entity",
  sourceModel: "transaction",
  sourceQueryDefinitionId: "",
  status: "ACTIVE",
  aggregationOperation: "COUNT",
  aggregationField: "",
  fieldsDependency: [],
  filterRows: [],
  groupBy: [],
  dimensions: [],
  dateFieldGranularity: {},
  parameters: [
    {
      name: "currentPeriod",
      valueType: "dateBucket",
      granularity: "month",
    },
  ],
  computation: createDefaultComputedComputation(),
  valueDisplayFormat: "percent",
  version: 1,
  schemaVersionDependency: 1,
};

describe("validateMetricDraftForSave", () => {
  it("requires computation for computed metrics", () => {
    expect(
      validateMetricDraftForSave(
        { ...baseDraft, computation: undefined },
        undefined,
      ),
    ).toBe("Computation is required for computed metrics.");
  });

  it("accepts computed draft with computation", () => {
    expect(validateMetricDraftForSave(baseDraft, undefined)).toBeNull();
  });
});

describe("metric selection URL helpers", () => {
  it("reads selected metric id from search params", () => {
    const params = new URLSearchParams({
      [METRIC_SELECTION_SEARCH_PARAM]: "m2",
    });
    expect(getMetricSelectionId(params)).toBe("m2");
  });

  it("writes and clears selected metric id in search params", () => {
    const params = new URLSearchParams({ q: "income" });
    const withSelection = applyMetricSelectionToSearchParams(params, "m2");
    expect(withSelection.get(METRIC_SELECTION_SEARCH_PARAM)).toBe("m2");
    expect(withSelection.get("q")).toBe("income");

    const cleared = applyMetricSelectionToSearchParams(withSelection, "");
    expect(cleared.get(METRIC_SELECTION_SEARCH_PARAM)).toBeNull();
    expect(cleared.get("q")).toBe("income");
  });
});
