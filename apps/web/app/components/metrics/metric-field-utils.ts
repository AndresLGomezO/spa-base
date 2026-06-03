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

export function formatDateGranularityLabel(
  field: string,
  granularity: MetricDateGranularity,
): string {
  return `${field} (${granularity})`;
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

export interface MetricSummaryContext {
  readonly name: string;
  readonly description: string;
  readonly sourceModel: string;
  readonly sourceModelLabel: string;
  readonly operation: MetricOperation;
  readonly aggregationField: string;
  readonly fieldsDependency: readonly string[];
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

export function formatFieldList(fields: readonly string[]): string {
  if (fields.length === 0) {
    return "";
  }
  return fields.join(", ");
}
