import type {
  ComputedMetricComputation,
  MetricComputationMode,
  MetricDefinitionFormData,
  MetricDefinitionParameter,
} from "@repo/metrics-engine/browser";
import { toPortableMetricDefinition } from "@repo/metrics-engine/browser";

import type { MetricFilterEditorRow } from "../metric-field-utils";
import {
  getInitialAggregationFromMetric,
  metricFiltersToEditorRows,
  type MetricOperation,
} from "../metric-field-utils";
import type { MetricDefinitionRecord } from "../../../lib/api-client";
import type {
  MetricDateGranularity,
  MetricValueDisplayFormat,
} from "@repo/metrics-engine/browser";

export interface MetricFormStateExportInput {
  readonly name: string;
  readonly description: string;
  readonly computationMode: MetricComputationMode;
  readonly sourceModel: string;
  readonly sourceType: "entity" | "query";
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

function buildAggregationsFromForm(input: MetricFormStateExportInput) {
  if (input.computationMode === "computed") {
    return [{ operation: "COUNT" as const }];
  }

  if (input.aggregationOperation === "COUNT") {
    return [{ operation: "COUNT" as const }];
  }

  return [
    {
      field: input.aggregationField.trim(),
      operation: input.aggregationOperation,
    },
  ];
}

function resolveFieldsDependency(input: MetricFormStateExportInput): string[] {
  if (input.computationMode === "computed") {
    return [];
  }

  if (input.fieldsDependency.length > 0) {
    return [...input.fieldsDependency];
  }

  if (input.aggregationOperation === "COUNT") {
    return [];
  }

  return input.aggregationField.trim() ? [input.aggregationField.trim()] : [];
}

function normalizeFiltersForExport(
  filterRows: readonly MetricFilterEditorRow[],
): MetricDefinitionFormData["filters"] {
  return filterRows
    .filter((row) => row.field.trim().length > 0)
    .map((row) => {
      if (row.op === "in") {
        return {
          field: row.field.trim(),
          op: "in" as const,
          value: row.listValues.map((value) => value.trim()).filter(Boolean),
        };
      }

      const scalar = row.scalarValue.trim();
      if (scalar === "true" || scalar === "false") {
        return {
          field: row.field.trim(),
          op: "eq" as const,
          value: scalar === "true",
        };
      }

      const asNumber = Number(scalar);
      return {
        field: row.field.trim(),
        op: "eq" as const,
        value:
          Number.isFinite(asNumber) && scalar.length > 0 ? asNumber : scalar,
      };
    });
}

export function exportMetricFormState(
  input: MetricFormStateExportInput,
): MetricDefinitionFormData {
  const aggregations = buildAggregationsFromForm(input);
  const isComputed = input.computationMode === "computed";

  return {
    name: input.name.trim(),
    ...(input.description.trim()
      ? { description: input.description.trim() }
      : {}),
    computationMode: input.computationMode,
    sourceModel: input.sourceModel,
    ...(input.sourceType === "query" && input.sourceQueryDefinitionId
      ? { sourceQueryDefinitionId: input.sourceQueryDefinitionId }
      : {}),
    filters:
      isComputed || input.sourceType === "query"
        ? []
        : normalizeFiltersForExport(input.filterRows),
    groupBy: isComputed ? [] : [...input.groupBy],
    dimensions: isComputed ? [] : [...input.dimensions],
    dateFieldGranularity: isComputed ? {} : { ...input.dateFieldGranularity },
    valueDisplayFormat: input.valueDisplayFormat,
    parameters: [...input.parameters],
    ...(input.computation ? { computation: input.computation } : {}),
    aggregations,
    version: input.version,
    schemaVersionDependency: input.schemaVersionDependency,
    fieldsDependency: resolveFieldsDependency(input),
    status: input.status,
  };
}

export function exportMetricRecord(
  record: MetricDefinitionRecord,
): MetricDefinitionFormData {
  return toPortableMetricDefinition(
    record as Parameters<typeof toPortableMetricDefinition>[0],
  );
}

export interface MetricFormStateImportResult {
  readonly name: string;
  readonly description: string;
  readonly computationMode: MetricComputationMode;
  readonly sourceModel: string;
  readonly sourceType: "entity" | "query";
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

export function importMetricFormState(
  data: MetricDefinitionFormData,
): MetricFormStateImportResult {
  const aggregation = data.aggregations?.[0];
  const operation =
    aggregation?.operation === "COUNT"
      ? "COUNT"
      : (aggregation?.operation ?? "SUM");
  const aggregationField =
    aggregation && "field" in aggregation && aggregation.field
      ? aggregation.field
      : "";

  return {
    name: data.name,
    description: data.description ?? "",
    computationMode: data.computationMode ?? "aggregated",
    sourceModel: data.sourceModel,
    sourceType: data.sourceQueryDefinitionId ? "query" : "entity",
    sourceQueryDefinitionId: data.sourceQueryDefinitionId ?? "",
    status: data.status,
    aggregationOperation: operation,
    aggregationField,
    fieldsDependency: [...data.fieldsDependency],
    filterRows: metricFiltersToEditorRows(data.filters),
    groupBy: [...data.groupBy],
    dimensions: [...data.dimensions],
    dateFieldGranularity: { ...data.dateFieldGranularity },
    parameters: [...(data.parameters ?? [])],
    computation: data.computation as ComputedMetricComputation | undefined,
    valueDisplayFormat: data.valueDisplayFormat,
    version: data.version,
    schemaVersionDependency: data.schemaVersionDependency,
  };
}

export function buildExportInputFromRecord(
  record: MetricDefinitionRecord,
): MetricFormStateExportInput {
  const aggregation = getInitialAggregationFromMetric(record);
  return {
    name: record.name,
    description: record.description ?? "",
    computationMode: record.computationMode ?? "aggregated",
    sourceModel: record.sourceModel,
    sourceType: record.sourceQueryDefinitionId ? "query" : "entity",
    sourceQueryDefinitionId: record.sourceQueryDefinitionId ?? "",
    status: record.status,
    aggregationOperation: aggregation.operation,
    aggregationField: aggregation.field,
    fieldsDependency: record.fieldsDependency,
    filterRows: metricFiltersToEditorRows(record.filters),
    groupBy: record.groupBy,
    dimensions: record.dimensions,
    dateFieldGranularity: record.dateFieldGranularity,
    parameters: record.parameters ?? [],
    computation: record.computation as ComputedMetricComputation | undefined,
    valueDisplayFormat: record.valueDisplayFormat,
    version: record.version,
    schemaVersionDependency: record.schemaVersionDependency,
  };
}
