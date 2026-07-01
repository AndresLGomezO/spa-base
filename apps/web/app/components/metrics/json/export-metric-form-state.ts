import type { MetricDefinitionFormData } from "@repo/metrics-engine/browser";

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
  readonly sourceModel: string;
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
  readonly valueDisplayFormat: MetricValueDisplayFormat;
  readonly version: number;
  readonly schemaVersionDependency: number;
}

function buildAggregationsFromForm(input: MetricFormStateExportInput) {
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

  return {
    name: input.name.trim(),
    ...(input.description.trim()
      ? { description: input.description.trim() }
      : {}),
    sourceModel: input.sourceModel,
    filters: normalizeFiltersForExport(input.filterRows),
    groupBy: [...input.groupBy],
    dimensions: [...input.dimensions],
    dateFieldGranularity: { ...input.dateFieldGranularity },
    valueDisplayFormat: input.valueDisplayFormat,
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
  const aggregation = getInitialAggregationFromMetric(record);
  return exportMetricFormState({
    name: record.name,
    description: record.description ?? "",
    sourceModel: record.sourceModel,
    status: record.status,
    aggregationOperation: aggregation.operation,
    aggregationField: aggregation.field,
    fieldsDependency: record.fieldsDependency,
    filterRows: metricFiltersToEditorRows(record.filters),
    groupBy: record.groupBy,
    dimensions: record.dimensions,
    dateFieldGranularity: record.dateFieldGranularity,
    valueDisplayFormat: record.valueDisplayFormat,
    version: record.version,
    schemaVersionDependency: record.schemaVersionDependency,
  });
}

export interface MetricFormStateImportResult {
  readonly name: string;
  readonly description: string;
  readonly sourceModel: string;
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
  readonly valueDisplayFormat: MetricValueDisplayFormat;
  readonly version: number;
  readonly schemaVersionDependency: number;
}

export function importMetricFormState(
  data: MetricDefinitionFormData,
): MetricFormStateImportResult {
  const aggregation = data.aggregations[0];
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
    sourceModel: data.sourceModel,
    status: data.status,
    aggregationOperation: operation,
    aggregationField,
    fieldsDependency: [...data.fieldsDependency],
    filterRows: metricFiltersToEditorRows(data.filters),
    groupBy: [...data.groupBy],
    dimensions: [...data.dimensions],
    dateFieldGranularity: { ...data.dateFieldGranularity },
    valueDisplayFormat: data.valueDisplayFormat,
    version: data.version,
    schemaVersionDependency: data.schemaVersionDependency,
  };
}
