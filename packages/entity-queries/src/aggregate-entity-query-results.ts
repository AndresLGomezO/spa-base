import { compareFilterValues } from "./compare-filter-values.js";
import {
  internalKeysForAggregation,
  outputKeyForAggregation,
} from "./aggregation-field-keys.js";
import type { EntityQueryAggregationSpec, EntityQuerySort } from "./types.js";

export interface AggregateEntityQueryResultsSpec {
  readonly groupBy: readonly string[];
  readonly aggregations: readonly EntityQueryAggregationSpec[];
  readonly groupSort: readonly EntityQuerySort[];
  readonly groupLimit?: number;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return 0;
}

export function getRecordFieldValue(
  record: Record<string, unknown>,
  fieldPath: string,
): unknown {
  const segments = fieldPath.split(".").filter((segment) => segment.length > 0);
  let current: unknown = record;

  for (const segment of segments) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function buildGroupKey(
  record: Record<string, unknown>,
  groupBy: readonly string[],
): string {
  return groupBy
    .map((field) => {
      const value = getRecordFieldValue(record, field);
      if (value === undefined || value === null) {
        return "";
      }
      return String(value);
    })
    .join("\u0000");
}

function buildGroupRow(
  record: Record<string, unknown>,
  groupBy: readonly string[],
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const field of groupBy) {
    row[field] = getRecordFieldValue(record, field) ?? null;
  }
  return row;
}

function contributionForSpec(
  spec: EntityQueryAggregationSpec,
  record: Record<string, unknown>,
): Record<string, number> {
  const increments: Record<string, number> = {};
  const keys = internalKeysForAggregation(spec.operation, spec.field);

  switch (spec.operation) {
    case "SUM": {
      if (!spec.field) {
        break;
      }

      increments[keys[0]!] = toNumber(getRecordFieldValue(record, spec.field));
      break;
    }
    case "COUNT": {
      if (!spec.field) {
        increments[keys[0]!] = 1;
        break;
      }

      const value = getRecordFieldValue(record, spec.field);
      increments[keys[0]!] = value !== undefined && value !== null ? 1 : 0;
      break;
    }
    case "AVG": {
      if (!spec.field) {
        break;
      }

      const value = getRecordFieldValue(record, spec.field);
      const hasValue = value !== undefined && value !== null;
      increments[keys[0]!] = toNumber(value);
      increments[keys[1]!] = hasValue ? 1 : 0;
      break;
    }
  }

  return increments;
}

function mergeIncrements(
  target: Record<string, number>,
  source: Record<string, number>,
): void {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + value;
  }
}

function finalizeAggregationOutputs(
  internalValues: Record<string, number>,
  aggregations: readonly EntityQueryAggregationSpec[],
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const spec of aggregations) {
    const outputKey = outputKeyForAggregation(spec.operation, spec.field);

    if (spec.operation === "AVG") {
      const sumKey = internalKeysForAggregation("AVG", spec.field)[0]!;
      const countKey = internalKeysForAggregation("AVG", spec.field)[1]!;
      const sum = internalValues[sumKey] ?? 0;
      const count = internalValues[countKey] ?? 0;
      output[outputKey] = count > 0 ? sum / count : 0;
      continue;
    }

    const internalKey = internalKeysForAggregation(
      spec.operation,
      spec.field,
    )[0]!;
    output[outputKey] = internalValues[internalKey] ?? 0;
  }

  return output;
}

function compareGroupRows(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  sort: readonly EntityQuerySort[],
): number {
  for (const entry of sort) {
    const comparison = compareFilterValues(
      left[entry.field],
      right[entry.field],
    );
    if (comparison !== 0) {
      return entry.direction === "desc" ? -comparison : comparison;
    }
  }

  return 0;
}

export function aggregateEntityQueryResults(
  records: readonly Record<string, unknown>[],
  spec: AggregateEntityQueryResultsSpec,
): readonly Record<string, unknown>[] {
  if (spec.groupBy.length === 0 || spec.aggregations.length === 0) {
    return [];
  }

  const groups = new Map<
    string,
    {
      readonly groupRow: Record<string, unknown>;
      readonly internalValues: Record<string, number>;
    }
  >();

  for (const record of records) {
    const key = buildGroupKey(record, spec.groupBy);
    const existing = groups.get(key);

    if (!existing) {
      const internalValues: Record<string, number> = {};
      for (const aggregation of spec.aggregations) {
        mergeIncrements(
          internalValues,
          contributionForSpec(aggregation, record),
        );
      }

      groups.set(key, {
        groupRow: buildGroupRow(record, spec.groupBy),
        internalValues,
      });
      continue;
    }

    for (const aggregation of spec.aggregations) {
      mergeIncrements(
        existing.internalValues,
        contributionForSpec(aggregation, record),
      );
    }
  }

  let rows = [...groups.values()].map(({ groupRow, internalValues }) => ({
    ...groupRow,
    ...finalizeAggregationOutputs(internalValues, spec.aggregations),
  }));

  if (spec.groupSort.length > 0) {
    rows = [...rows].sort((left, right) =>
      compareGroupRows(left, right, spec.groupSort),
    );
  }

  if (spec.groupLimit !== undefined) {
    rows = rows.slice(0, spec.groupLimit);
  }

  return rows;
}

export function listEntityQueryAggregationOutputFields(
  spec: Pick<AggregateEntityQueryResultsSpec, "groupBy" | "aggregations">,
): readonly string[] {
  return [
    ...spec.groupBy,
    ...spec.aggregations.map((entry) =>
      outputKeyForAggregation(entry.operation, entry.field),
    ),
  ];
}
