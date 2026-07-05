import type {
  ComputedMetricComputation,
  MetricComputationMode,
  MetricDateGranularity,
  MetricDefinitionParameter,
  MetricValueDisplayFormat,
} from "@repo/metrics-engine/browser";
import { toPortableMetricDefinition } from "@repo/metrics-engine/browser";

import type { MetricDefinitionRecord } from "../../lib/api-client.js";
import type {
  MetricFilterEditorRow,
  MetricOperation,
} from "./metric-field-utils.js";
import {
  buildExportInputFromRecord,
  exportMetricFormState,
  type MetricFormStateExportInput,
} from "./json/export-metric-form-state.js";

export type MetricSourceType = "entity" | "query";

export interface MetricDefinitionDraft {
  readonly name: string;
  readonly description: string;
  readonly computationMode: MetricComputationMode;
  readonly sourceType: MetricSourceType;
  readonly sourceModel: string;
  readonly sourceQueryDefinitionId: string;
  readonly status: "ACTIVE" | "PAUSED";
  readonly aggregationOperation: MetricOperation;
  readonly aggregationField: string;
  readonly fieldsDependency: readonly string[];
  readonly filterRows: readonly MetricFilterEditorRow[];
  readonly groupBy: readonly string[];
  readonly dimensions: readonly string[];
  readonly dateFieldGranularity: Readonly<
    Record<string, MetricDateGranularity>
  >;
  readonly parameters: readonly MetricDefinitionParameter[];
  readonly computation: ComputedMetricComputation | undefined;
  readonly valueDisplayFormat: MetricValueDisplayFormat;
  readonly version: number;
  readonly schemaVersionDependency: number;
}

export function createDefaultComputedComputation(): ComputedMetricComputation {
  return {
    type: "percentChange",
    current: {
      type: "metricRef",
      metricDefinitionId: "",
      parameterMap: {},
    },
    baseline: {
      type: "metricRef",
      metricDefinitionId: "",
      parameterMap: {},
    },
  };
}

export function buildDraftFromMetricRecord(
  record: MetricDefinitionRecord | null,
  options?: { readonly defaultSourceModel?: string },
): MetricDefinitionDraft {
  if (!record) {
    return {
      name: "",
      description: "",
      computationMode: "aggregated",
      sourceType: "entity",
      sourceModel: options?.defaultSourceModel ?? "",
      sourceQueryDefinitionId: "",
      status: "ACTIVE",
      aggregationOperation: "SUM",
      aggregationField: "",
      fieldsDependency: [],
      filterRows: [],
      groupBy: [],
      dimensions: [],
      dateFieldGranularity: {},
      parameters: [],
      computation: undefined,
      valueDisplayFormat: "number",
      version: 1,
      schemaVersionDependency: 1,
    };
  }

  return { ...buildExportInputFromRecord(record) };
}

function draftToExportInput(
  draft: MetricDefinitionDraft,
): MetricFormStateExportInput {
  return { ...draft };
}

function exportRecordToPortableJson(record: MetricDefinitionRecord) {
  return toPortableMetricDefinition(
    record as Parameters<typeof toPortableMetricDefinition>[0],
  );
}

export function isDraftDirty(
  draft: MetricDefinitionDraft,
  record: MetricDefinitionRecord,
): boolean {
  return (
    JSON.stringify(exportMetricFormState(draftToExportInput(draft))) !==
    JSON.stringify(exportRecordToPortableJson(record))
  );
}
