import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import {
  formatFieldLabel,
  getEntityLabel,
} from "../../entities/entity-catalog";
import type { MetricDefinitionRecord } from "../../lib/api-client";
import type { SearchableMultiSelectOption } from "@repo/ui";
import type {
  MetricDateGranularity,
  MetricValueDisplayFormat,
} from "@repo/metrics-engine/browser";

type MetricFilterRecord = MetricDefinitionRecord["filters"][number];

export interface MetricFilterEditorRow {
  readonly id: string;
  readonly field: string;
  readonly op: "eq" | "in";
  readonly scalarValue: string;
  readonly listValues: readonly string[];
}

let metricFilterRowCounter = 0;

function createMetricFilterEditorRowId(): string {
  metricFilterRowCounter += 1;
  return `metric-filter-${metricFilterRowCounter}`;
}

export function createEmptyMetricFilterEditorRow(): MetricFilterEditorRow {
  return {
    id: createMetricFilterEditorRowId(),
    field: "",
    op: "eq",
    scalarValue: "",
    listValues: [],
  };
}

export function metricFiltersToEditorRows(
  filters: readonly MetricFilterRecord[],
): MetricFilterEditorRow[] {
  return filters.map((filter) => ({
    id: createMetricFilterEditorRowId(),
    field: filter.field,
    op: filter.op,
    scalarValue:
      filter.op === "eq" && isScalarMetricFilterValue(filter.value)
        ? formatFilterScalarForEditor(filter.value)
        : "",
    listValues:
      filter.op === "in" && Array.isArray(filter.value)
        ? [...filter.value]
        : [],
  }));
}

function isScalarMetricFilterValue(
  value: string | number | boolean | readonly string[],
): value is string | number | boolean {
  return !Array.isArray(value);
}

function formatFilterScalarForEditor(value: string | number | boolean): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

export function listMetricFilterFieldOptions(
  entity: EntityCatalogEntry | undefined,
): readonly SearchableMultiSelectOption[] {
  if (!entity) {
    return [];
  }

  return Object.entries(entity.fields)
    .filter(([, meta]) => meta.type !== "document")
    .map(([name]) => ({
      value: name,
      label: formatFieldLabel(name, entity),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function collectFilterFieldNames(
  filters: readonly MetricFilterRecord[],
): readonly string[] {
  return [...new Set(filters.map((filter) => filter.field))];
}

export function mergeFieldsDependencyWithFilters(
  fieldsDependency: readonly string[],
  filters: readonly MetricFilterRecord[],
): readonly string[] {
  const merged = new Set(fieldsDependency);
  for (const field of collectFilterFieldNames(filters)) {
    merged.add(field);
  }
  return [...merged].sort((left, right) => left.localeCompare(right));
}

function parseBooleanFilterValue(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return null;
}

function parseNumberFilterValue(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseStringListValues(values: readonly string[]): string[] | null {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : null;
}

function parseCommaSeparatedList(value: string): string[] | null {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : null;
}

export function normalizeMetricFiltersForSave(
  rows: readonly MetricFilterEditorRow[],
  entity: EntityCatalogEntry | undefined,
):
  | { readonly filters: readonly MetricFilterRecord[] }
  | { readonly error: string } {
  const filters: MetricFilterRecord[] = [];

  for (const row of rows) {
    const field = row.field.trim();
    if (field.length === 0) {
      continue;
    }

    const meta = entity?.fields[field];
    if (!meta || meta.type === "document") {
      return { error: field };
    }

    if (row.op === "eq") {
      const parsed = parseFilterEqValue(
        row.scalarValue,
        meta.type,
        meta.enumValues,
      );
      if (parsed === null) {
        return { error: field };
      }
      filters.push({ field, op: "eq", value: parsed });
      continue;
    }

    if (row.op === "in") {
      const inResult = parseFilterInValue(row, meta.type, meta.enumValues);
      if (inResult === null) {
        return { error: field };
      }
      filters.push({ field, op: "in", value: inResult });
      continue;
    }
  }

  return { filters };
}

function parseFilterInValue(
  row: MetricFilterEditorRow,
  fieldType: string,
  enumValues: readonly string[] | undefined,
): readonly string[] | null {
  if (fieldType === "enum" && enumValues) {
    const values = parseStringListValues(row.listValues);
    if (!values || values.some((value) => !enumValues.includes(value))) {
      return null;
    }
    return values;
  }

  if (fieldType === "boolean") {
    const rawValues =
      row.listValues.length > 0
        ? [...row.listValues]
        : (parseCommaSeparatedList(row.scalarValue) ?? []);
    const normalized = rawValues
      .map((value) => parseBooleanFilterValue(value))
      .filter((value): value is boolean => value !== null)
      .map((value) => (value ? "true" : "false"));
    return normalized.length > 0 ? [...new Set(normalized)] : null;
  }

  if (fieldType === "number") {
    const rawValues =
      row.listValues.length > 0
        ? [...row.listValues]
        : (parseCommaSeparatedList(row.scalarValue) ?? []);
    const normalized = rawValues
      .map((value) => parseNumberFilterValue(value))
      .filter((value): value is number => value !== null)
      .map(String);
    return normalized.length > 0 ? normalized : null;
  }

  const values =
    parseStringListValues(row.listValues) ??
    parseCommaSeparatedList(row.scalarValue);
  return values;
}

function parseFilterEqValue(
  rawValue: string,
  fieldType: string,
  enumValues: readonly string[] | undefined,
): string | number | boolean | null {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (fieldType === "boolean") {
    return parseBooleanFilterValue(trimmed);
  }

  if (fieldType === "number") {
    return parseNumberFilterValue(trimmed);
  }

  if (fieldType === "enum" && enumValues) {
    return enumValues.includes(trimmed) ? trimmed : null;
  }

  return trimmed;
}

function formatMetricFilterSummary(
  filter: MetricFilterRecord,
  entity: EntityCatalogEntry | undefined,
): string {
  const fieldLabel = formatFieldLabel(filter.field, entity);
  if (filter.op === "eq") {
    return `${fieldLabel} = ${formatFilterScalarForEditor(filter.value as string | number | boolean)}`;
  }

  const values = Array.isArray(filter.value)
    ? filter.value.join(", ")
    : String(filter.value);
  return `${fieldLabel} in [${values}]`;
}

export function formatMetricFiltersSummary(
  filters: readonly MetricFilterRecord[],
  entity: EntityCatalogEntry | undefined,
): string {
  if (filters.length === 0) {
    return "";
  }
  return filters
    .map((filter) => formatMetricFilterSummary(filter, entity))
    .join("; ");
}

export const METRIC_OPERATIONS = ["SUM", "COUNT", "AVG"] as const;

export type MetricOperation = (typeof METRIC_OPERATIONS)[number];

export function operationRequiresNumericField(
  operation: MetricOperation,
): boolean {
  return operation === "SUM" || operation === "AVG";
}

export function getNumericFieldNames(
  entity: EntityCatalogEntry | undefined,
): readonly string[] {
  if (!entity) {
    return [];
  }

  return Object.entries(entity.fields)
    .filter(([, meta]) => meta.type === "number")
    .map(([name]) => name)
    .sort((left, right) => left.localeCompare(right));
}

export function isDateEntityField(
  entity: EntityCatalogEntry | undefined,
  fieldName: string,
): boolean {
  return entity?.fields[fieldName]?.type === "date";
}

export function listDateFieldsInKeys(
  entity: EntityCatalogEntry | undefined,
  groupBy: readonly string[],
  dimensions: readonly string[],
): readonly string[] {
  const fields = new Set([...groupBy, ...dimensions]);
  return [...fields]
    .filter((field) => isDateEntityField(entity, field))
    .sort((left, right) => left.localeCompare(right));
}

export function pruneDateFieldGranularity(
  dateFieldGranularity: Readonly<Record<string, MetricDateGranularity>>,
  groupBy: readonly string[],
  dimensions: readonly string[],
  entity?: EntityCatalogEntry,
): Record<string, MetricDateGranularity> {
  const allowed = new Set(listDateFieldsInKeys(entity, groupBy, dimensions));
  const next: Record<string, MetricDateGranularity> = {};
  for (const [field, granularity] of Object.entries(dateFieldGranularity)) {
    if (allowed.has(field)) {
      next[field] = granularity;
    }
  }
  return next;
}

export function validateClientDateFieldGranularity(
  entity: EntityCatalogEntry | undefined,
  groupBy: readonly string[],
  dimensions: readonly string[],
  dateFieldGranularity: Readonly<Record<string, MetricDateGranularity>>,
): string | null {
  for (const field of listDateFieldsInKeys(entity, groupBy, dimensions)) {
    if (!dateFieldGranularity[field]) {
      return field;
    }
  }

  for (const field of Object.keys(dateFieldGranularity)) {
    if (!isDateEntityField(entity, field)) {
      return field;
    }
  }

  return null;
}

export function inferDefaultValueDisplayFormat(
  entity: EntityCatalogEntry | undefined,
  aggregationField: string,
): MetricValueDisplayFormat {
  if (entity?.ui.fields?.[aggregationField]?.displayFormat === "currency") {
    return "currency";
  }
  return "number";
}

function getAllFieldNames(
  entity: EntityCatalogEntry | undefined,
): readonly string[] {
  if (!entity) {
    return [];
  }

  return Object.keys(entity.fields).sort((left, right) =>
    left.localeCompare(right),
  );
}

export function buildEntityFieldOptions(
  entity: EntityCatalogEntry | undefined,
): readonly SearchableMultiSelectOption[] {
  if (!entity) {
    return [];
  }

  return getAllFieldNames(entity).map((name) => ({
    value: name,
    label: formatFieldLabel(name, entity),
  }));
}

export function getInitialAggregationFromMetric(
  metric: MetricDefinitionRecord | null,
): { readonly operation: MetricOperation; readonly field: string } {
  const spec = metric?.aggregations[0];
  const operation = spec?.operation ?? "SUM";
  if (operation === "COUNT" && !spec?.field) {
    return { operation: "COUNT", field: "" };
  }

  return {
    operation,
    field: spec?.field ?? "",
  };
}

export function formatAggregationLabel(
  aggregations: MetricDefinitionRecord["aggregations"],
): string {
  const spec = aggregations[0];
  if (!spec) {
    return "";
  }

  if (spec.operation === "COUNT" && !spec.field) {
    return "COUNT";
  }

  return `${spec.operation}(${spec.field})`;
}

interface MetricSummaryContext {
  readonly name: string;
  readonly description: string;
  readonly sourceModel: string;
  readonly sourceModelLabel: string;
  readonly operation: MetricOperation;
  readonly aggregationField: string;
  readonly fieldsDependency: readonly string[];
  readonly filters: readonly MetricFilterRecord[];
  readonly filtersSummary: string;
  readonly groupBy: readonly string[];
  readonly dimensions: readonly string[];
  readonly selectedDateFields: readonly string[];
  readonly dateFieldGranularity: Readonly<
    Record<string, MetricDateGranularity>
  >;
  readonly valueDisplayFormat: MetricValueDisplayFormat;
  readonly targetCollection?: string;
  readonly isCreate: boolean;
}

export function canShowMetricSummary(input: {
  readonly name: string;
  readonly sourceModel: string;
  readonly operation: MetricOperation;
  readonly aggregationField: string;
}): boolean {
  if (!input.name.trim() || !input.sourceModel) {
    return false;
  }

  if (operationRequiresNumericField(input.operation)) {
    return Boolean(input.aggregationField.trim());
  }

  return true;
}

export function buildMetricSummaryContext(input: {
  readonly name: string;
  readonly description: string;
  readonly sourceModel: string;
  readonly entity: EntityCatalogEntry | undefined;
  readonly operation: MetricOperation;
  readonly aggregationField: string;
  readonly fieldsDependency: readonly string[];
  readonly filters: readonly MetricFilterRecord[];
  readonly groupBy: readonly string[];
  readonly dimensions: readonly string[];
  readonly dateFieldGranularity: Readonly<
    Record<string, MetricDateGranularity>
  >;
  readonly valueDisplayFormat: MetricValueDisplayFormat;
  readonly targetCollection?: string;
  readonly isCreate: boolean;
}): MetricSummaryContext {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    sourceModel: input.sourceModel,
    sourceModelLabel: input.entity
      ? getEntityLabel(input.entity)
      : input.sourceModel,
    operation: input.operation,
    aggregationField: input.aggregationField.trim(),
    fieldsDependency: input.fieldsDependency,
    filters: input.filters,
    filtersSummary: formatMetricFiltersSummary(input.filters, input.entity),
    groupBy: input.groupBy,
    dimensions: input.dimensions,
    selectedDateFields: listDateFieldsInKeys(
      input.entity,
      input.groupBy,
      input.dimensions,
    ),
    dateFieldGranularity: input.dateFieldGranularity,
    valueDisplayFormat: input.valueDisplayFormat,
    targetCollection: input.targetCollection,
    isCreate: input.isCreate,
  };
}

export function formatSummaryExampleValues(
  operation: MetricOperation,
  field: string,
  groupBy: readonly string[],
  dimensions: readonly string[],
): string {
  const normalizedField = field.replace(/[^a-zA-Z0-9_]/g, "_");
  const valueParts: string[] = [];

  switch (operation) {
    case "SUM":
      valueParts.push(`sum_${normalizedField}: 1500`);
      break;
    case "AVG":
      valueParts.push(
        `sum_${normalizedField}: 1500`,
        `count_${normalizedField}: 3`,
        `avg_${normalizedField}: 500`,
      );
      break;
    case "COUNT":
      valueParts.push("count: 42");
      break;
    default:
      break;
  }

  const groupExample =
    groupBy.length > 0
      ? `{ ${groupBy.map((key) => `${key}: "…"`).join(", ")} }`
      : "{}";
  const dimensionsExample =
    dimensions.length > 0
      ? `{ ${dimensions.map((key) => `${key}: "…"`).join(", ")} }`
      : "{}";

  return `{ ${valueParts.join(", ")}, group: ${groupExample}, dimensions: ${dimensionsExample} }`;
}
