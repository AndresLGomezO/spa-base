import type {
  ResolvedChartComponentConfig,
  ChartEntityQueryAggregate,
  ChartEntityQueryRowFilter,
  ChartEntityQueryValueTransform,
  ChartMetricSeriesStep,
  MetricBindingSource,
} from "@repo/ui-builder-core";
import type { ChartRenderSeries } from "@repo/ui-charts";
import { normalizeMetricDateValue } from "@repo/metrics-engine/browser";

import { loadEntityQueryDefinitionsCached } from "../../../hooks/useEntityQueryDefinitions.js";
import type { EntityCatalogEntry } from "../../../entities/entity-catalog.js";
import type { EntityQueryDefinitionRecord } from "../../../lib/api-client.js";
import { resolveMetricBindingSource } from "../../../lib/metric-binding-resolution.js";
import type { PageFilterContext } from "../../../lib/metric-binding-resolution.js";
import { resolveEntityQueryDefinitionDocumentId } from "../../../lib/resolve-entity-query-definition-reference.js";
import { executeEntityQueryDefinition } from "../execute-entity-query-definition.js";
import { interpolateChartSeriesOffsets } from "./chart-series-step.js";
import { mapStaticPointsToRenderSeries } from "./map-chart-render-series.js";

function readFieldValue(
  record: Record<string, unknown>,
  fieldPath: string,
): unknown {
  const segments = fieldPath.split(".");
  let current: unknown = record;
  for (const segment of segments) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function coerceNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeChartFieldValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).trim();
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["value", "code", "id", "name"] as const) {
      const nested = record[key];
      if (
        typeof nested === "string" ||
        typeof nested === "number" ||
        typeof nested === "boolean"
      ) {
        return String(nested).trim();
      }
    }
  }

  return String(value).trim();
}

function collectWhenValues(
  condition: ChartEntityQueryRowFilter | ChartEntityQueryValueTransform,
): readonly string[] {
  if (condition.whenOperator === "==") {
    return [normalizeChartFieldValue(condition.whenValue)];
  }

  const values = Array.isArray(condition.whenValue)
    ? condition.whenValue
    : [condition.whenValue];
  return values.map((entry) => normalizeChartFieldValue(entry));
}

interface NetBalanceTypeSets {
  readonly typeField: string | null;
  readonly allowedTypes: ReadonlySet<string>;
  readonly incomeTypes: ReadonlySet<string>;
  readonly outflowTypes: ReadonlySet<string>;
  readonly usesMetricParity: boolean;
}

const STANDARD_OUTFLOW_TYPE_VALUES = new Set(["EXPENSE", "PAYMENT"]);

function inferNetBalanceTypesFromRowFilters(
  rowFilters: readonly ChartEntityQueryRowFilter[] | undefined,
): {
  readonly typeField: string;
  readonly incomeTypes: ReadonlySet<string>;
  readonly outflowTypes: ReadonlySet<string>;
} | null {
  for (const filter of rowFilters ?? []) {
    if (filter.whenOperator !== "in") {
      continue;
    }

    const values = collectWhenValues(filter);
    const outflowValues = values.filter((value) =>
      STANDARD_OUTFLOW_TYPE_VALUES.has(value),
    );
    const incomeValues = values.filter(
      (value) => !STANDARD_OUTFLOW_TYPE_VALUES.has(value),
    );

    if (outflowValues.length === 0 || incomeValues.length === 0) {
      continue;
    }

    return {
      typeField: filter.whenField,
      incomeTypes: new Set(incomeValues),
      outflowTypes: new Set(outflowValues),
    };
  }

  return null;
}

export function deriveNetBalanceTypeSets(
  rowFilters: readonly ChartEntityQueryRowFilter[] | undefined,
  valueTransforms: readonly ChartEntityQueryValueTransform[] | undefined,
): NetBalanceTypeSets {
  const allowedTypes = new Set<string>();
  for (const filter of rowFilters ?? []) {
    for (const value of collectWhenValues(filter)) {
      if (value.length > 0) {
        allowedTypes.add(value);
      }
    }
  }

  const outflowTypes = new Set<string>();
  let typeField: string | null = rowFilters?.[0]?.whenField ?? null;
  const negativeTransforms: ChartEntityQueryValueTransform[] = [];
  const inferred = inferNetBalanceTypesFromRowFilters(rowFilters);

  for (const transform of valueTransforms ?? []) {
    if (Number(transform.multiplier) >= 0) {
      continue;
    }

    typeField = typeField ?? transform.whenField;
    negativeTransforms.push(transform);

    for (const value of collectWhenValues(transform)) {
      if (value.length > 0) {
        outflowTypes.add(value);
      }
    }
  }

  const incomeTypes = new Set<string>();

  if (negativeTransforms.length === 0 && inferred) {
    typeField = typeField ?? inferred.typeField;
    for (const type of inferred.outflowTypes) {
      outflowTypes.add(type);
    }
    for (const type of inferred.incomeTypes) {
      incomeTypes.add(type);
    }
  } else {
    for (const type of allowedTypes) {
      if (!outflowTypes.has(type)) {
        incomeTypes.add(type);
      }
    }

    if ((outflowTypes.size === 0 || incomeTypes.size === 0) && inferred) {
      typeField = typeField ?? inferred.typeField;
      for (const type of inferred.outflowTypes) {
        outflowTypes.add(type);
      }
      for (const type of inferred.incomeTypes) {
        incomeTypes.add(type);
      }
      for (const type of [...outflowTypes]) {
        incomeTypes.delete(type);
      }
    }
  }

  const allNegativeMultipliersAreNegativeOne =
    negativeTransforms.length === 0 ||
    negativeTransforms.every(
      (transform) => Number(transform.multiplier) === -1,
    );

  const usesMetricParity =
    outflowTypes.size > 0 &&
    incomeTypes.size > 0 &&
    allNegativeMultipliersAreNegativeOne;

  return {
    typeField,
    allowedTypes,
    incomeTypes,
    outflowTypes,
    usesMetricParity,
  };
}

function resolvePeriodBucketLabel(
  periodParameter: string,
  offset: number,
  unit: ChartMetricSeriesStep["unit"],
  context: PageFilterContext,
): string {
  const binding: MetricBindingSource = {
    type: "relativePeriod",
    field: periodParameter,
    anchor: "dashboardDateFilter",
    offset,
    unit,
  };

  const anchorValue = resolveMetricBindingSource(binding, context, {
    dateFieldGranularity: { [periodParameter]: unit },
  });

  if (typeof anchorValue === "string" && anchorValue.trim().length > 0) {
    return anchorValue;
  }

  return String(offset);
}

function matchesRowCondition(
  row: Record<string, unknown>,
  condition: ChartEntityQueryRowFilter | ChartEntityQueryValueTransform,
): boolean {
  const fieldValue = normalizeChartFieldValue(
    readFieldValue(row, condition.whenField),
  );

  if (condition.whenOperator === "==") {
    return fieldValue === normalizeChartFieldValue(condition.whenValue);
  }

  return collectWhenValues(condition).some((entry) => fieldValue === entry);
}

function rowMatchesFilters(
  row: Record<string, unknown>,
  rowFilters: readonly ChartEntityQueryRowFilter[] | undefined,
): boolean {
  if (!rowFilters || rowFilters.length === 0) {
    return true;
  }

  return rowFilters.every((filter) => matchesRowCondition(row, filter));
}

function applyValueTransforms(
  row: Record<string, unknown>,
  yFieldPath: string,
  valueTransforms: readonly ChartEntityQueryValueTransform[] | undefined,
): number {
  let value = coerceNumeric(readFieldValue(row, yFieldPath)) ?? 0;

  for (const transform of valueTransforms ?? []) {
    if (matchesRowCondition(row, transform)) {
      value *= Number(transform.multiplier);
    }
  }

  return value;
}

function resolveMetricParityContribution(
  row: Record<string, unknown>,
  yFieldPath: string,
  typeField: string,
  incomeTypes: ReadonlySet<string>,
  outflowTypes: ReadonlySet<string>,
): number | null {
  const typeValue = normalizeChartFieldValue(readFieldValue(row, typeField));
  const amount = coerceNumeric(readFieldValue(row, yFieldPath)) ?? 0;

  if (outflowTypes.has(typeValue)) {
    return -Math.abs(amount);
  }

  if (incomeTypes.has(typeValue)) {
    return amount;
  }

  return null;
}

function resolveRowBucketKey(
  row: Record<string, unknown>,
  xFieldPath: string,
  unit: ChartMetricSeriesStep["unit"],
): string | null {
  const raw = readFieldValue(row, xFieldPath);
  if (raw === undefined || raw === null) {
    return null;
  }

  if (typeof raw === "string" && unit === "month") {
    return normalizeMetricDateValue(raw, "month");
  }

  if (typeof raw === "string" || typeof raw === "number") {
    return normalizeMetricDateValue(raw, unit);
  }

  return null;
}

function bucketRows(
  rows: readonly Record<string, unknown>[],
  xFieldPath: string,
  yFieldPath: string,
  unit: ChartMetricSeriesStep["unit"],
  aggregate: ChartEntityQueryAggregate,
  rowFilters: readonly ChartEntityQueryRowFilter[] | undefined,
  valueTransforms: readonly ChartEntityQueryValueTransform[] | undefined,
): Map<string, number> {
  const buckets = new Map<string, number>();
  const netBalanceTypeSets = deriveNetBalanceTypeSets(
    rowFilters,
    valueTransforms,
  );
  const useMetricParity =
    netBalanceTypeSets.usesMetricParity &&
    netBalanceTypeSets.typeField !== null;

  for (const row of rows) {
    if (!rowMatchesFilters(row, rowFilters)) {
      continue;
    }

    const bucketKey = resolveRowBucketKey(row, xFieldPath, unit);
    if (!bucketKey) {
      continue;
    }

    if (aggregate === "count") {
      buckets.set(bucketKey, (buckets.get(bucketKey) ?? 0) + 1);
      continue;
    }

    let value: number;
    if (useMetricParity) {
      const contribution = resolveMetricParityContribution(
        row,
        yFieldPath,
        netBalanceTypeSets.typeField!,
        netBalanceTypeSets.incomeTypes,
        netBalanceTypeSets.outflowTypes,
      );
      if (contribution === null) {
        continue;
      }
      value = contribution;
    } else {
      value = applyValueTransforms(row, yFieldPath, valueTransforms);
    }

    buckets.set(bucketKey, (buckets.get(bucketKey) ?? 0) + value);
  }

  return buckets;
}

function resolveEntityQueryDefinitionFromCatalog(
  reference: string,
  definitions: readonly EntityQueryDefinitionRecord[],
): EntityQueryDefinitionRecord {
  const resolvedId = resolveEntityQueryDefinitionDocumentId(
    reference,
    definitions,
  );
  if (!resolvedId) {
    throw new Error(`Entity query definition reference is required.`);
  }

  const definition = definitions.find((entry) => entry.id === resolvedId);
  if (!definition) {
    throw new Error(`Entity query definition "${reference}" was not found.`);
  }

  return definition;
}

function resolvePeriodFetchUnit(
  timeSeries: NonNullable<
    Extract<
      ResolvedChartComponentConfig["dataSource"],
      { type: "entityQuery" }
    >["timeSeries"]
  >,
): ChartMetricSeriesStep["unit"] {
  if (timeSeries.layout === "monthToDateRightAligned") {
    return "month";
  }
  return timeSeries.step.unit;
}

export function resolveMonthToDateReferenceDay(
  context: PageFilterContext,
): number {
  const filter = context.dashboardDateFilter;
  if (!filter?.value?.trim()) {
    return 0;
  }

  const anchorMonth = filter.value.trim();
  const match = /^(\d{4})-(\d{2})$/.exec(anchorMonth);
  if (!match) {
    return 0;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return 0;
  }

  const now = new Date();
  const todayYear = now.getUTCFullYear();
  const todayMonth = now.getUTCMonth() + 1;
  const anchorKey = year * 12 + month;
  const todayKey = todayYear * 12 + todayMonth;

  if (anchorKey > todayKey) {
    return 0;
  }

  if (anchorKey === todayKey) {
    return now.getUTCDate();
  }

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function extractDayValuesForMonth(
  bucketValues: ReadonlyMap<string, number>,
  anchorMonth: string,
  referenceDay: number,
): ReadonlyMap<number, number> {
  const dayValues = new Map<number, number>();
  const monthPrefix = `${anchorMonth}-`;

  for (const [key, value] of bucketValues.entries()) {
    if (!key.startsWith(monthPrefix)) {
      continue;
    }

    const dayPart = key.slice(monthPrefix.length);
    const parsedDay = Number.parseInt(dayPart, 10);
    if (!Number.isFinite(parsedDay) || parsedDay < 1) {
      continue;
    }

    const cappedDay = Math.min(parsedDay, 30);
    if (referenceDay > 0 && parsedDay > referenceDay) {
      continue;
    }

    dayValues.set(cappedDay, (dayValues.get(cappedDay) ?? 0) + value);
  }

  return dayValues;
}

export function buildMonthToDateRightAlignedPoints(
  dayValues: ReadonlyMap<number, number>,
  referenceDay: number,
  slotCount = 30,
): Array<{ x: string; y: number }> {
  const activeDays = referenceDay <= 0 ? 0 : Math.min(referenceDay, slotCount);
  const points: Array<{ x: string; y: number }> = [];

  for (let slot = 0; slot < slotCount; slot += 1) {
    const dayNumber = slot - (slotCount - activeDays) + 1;
    const y =
      activeDays > 0 && dayNumber >= 1 && dayNumber <= activeDays
        ? (dayValues.get(dayNumber) ?? 0)
        : 0;
    points.push({ x: String(slot + 1), y });
  }

  return points;
}

function resolveAnchorMonth(context: PageFilterContext): string | null {
  const value = context.dashboardDateFilter?.value?.trim();
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }
  return value;
}

function buildParameterBindings(
  dataSource: Extract<
    ResolvedChartComponentConfig["dataSource"],
    { type: "entityQuery" }
  >,
): Record<string, MetricBindingSource> | null {
  const timeSeries = dataSource.timeSeries;
  if (!timeSeries) {
    return null;
  }

  return {
    ...dataSource.parameterBindings,
    [timeSeries.periodParameter]: {
      type: "relativePeriod",
      field: timeSeries.periodParameter,
      anchor: "dashboardDateFilter",
      offset: 0,
      unit: resolvePeriodFetchUnit(timeSeries),
    },
  };
}

export function buildEntityQueryRowsFetchKey(
  dataSource: Extract<
    ResolvedChartComponentConfig["dataSource"],
    { type: "entityQuery" }
  >,
  context: PageFilterContext,
): string | null {
  const timeSeries = dataSource.timeSeries;
  if (!timeSeries || dataSource.entityQueryDefinitionId.trim().length === 0) {
    return null;
  }

  return JSON.stringify({
    entityQueryDefinitionId: dataSource.entityQueryDefinitionId,
    parameterBindings: dataSource.parameterBindings,
    periodParameter: timeSeries.periodParameter,
    stepUnit: timeSeries.step.unit,
    layout: timeSeries.layout ?? "span",
    dashboardDateFilter: context.dashboardDateFilter,
    listFilters: context.listFilters,
    routeParams: context.routeParams,
  });
}

export async function fetchEntityQueryRows(
  dataSource: Extract<
    ResolvedChartComponentConfig["dataSource"],
    { type: "entityQuery" }
  >,
  catalog: readonly EntityCatalogEntry[],
  context: PageFilterContext,
): Promise<readonly Record<string, unknown>[]> {
  const queryReference = dataSource.entityQueryDefinitionId.trim();
  if (!queryReference || !dataSource.timeSeries) {
    return [];
  }

  const parameterBindings = buildParameterBindings(dataSource);
  if (!parameterBindings) {
    return [];
  }

  const definitions = await loadEntityQueryDefinitionsCached();
  const definition = resolveEntityQueryDefinitionFromCatalog(
    queryReference,
    definitions,
  );

  return executeEntityQueryDefinition(definition, catalog, {
    parameterBindings,
    context,
  });
}

export function bucketEntityQueryTimeSeriesRows(
  rows: readonly Record<string, unknown>[],
  dataSource: Extract<
    ResolvedChartComponentConfig["dataSource"],
    { type: "entityQuery" }
  >,
  context: PageFilterContext,
  seriesStyles: ResolvedChartComponentConfig["series"],
): readonly ChartRenderSeries[] {
  const timeSeries = dataSource.timeSeries;
  if (!timeSeries) {
    return [];
  }

  const bucketValues = bucketRows(
    rows,
    dataSource.xFieldPath,
    dataSource.yFieldPath,
    timeSeries.step.unit,
    timeSeries.aggregate,
    timeSeries.rowFilters,
    timeSeries.valueTransforms,
  );

  if (timeSeries.layout === "monthToDateRightAligned") {
    const anchorMonth = resolveAnchorMonth(context);
    const referenceDay = resolveMonthToDateReferenceDay(context);
    const dayValues =
      anchorMonth === null
        ? new Map<number, number>()
        : extractDayValuesForMonth(bucketValues, anchorMonth, referenceDay);
    const points = buildMonthToDateRightAlignedPoints(
      dayValues,
      referenceDay,
      timeSeries.bucketCount,
    );
    return mapStaticPointsToRenderSeries(points, seriesStyles);
  }

  const offsets = interpolateChartSeriesOffsets(
    timeSeries.step,
    timeSeries.bucketCount,
  );

  const points = offsets.map((offset) => {
    const x = resolvePeriodBucketLabel(
      timeSeries.periodParameter,
      offset,
      timeSeries.step.unit,
      context,
    );
    return {
      x,
      y: bucketValues.get(x) ?? 0,
    };
  });

  return mapStaticPointsToRenderSeries(points, seriesStyles);
}

export function buildEntityQueryTimeSeriesKey(
  dataSource: Extract<
    ResolvedChartComponentConfig["dataSource"],
    { type: "entityQuery" }
  >,
  context: PageFilterContext,
): string {
  return JSON.stringify({
    entityQueryDefinitionId: dataSource.entityQueryDefinitionId,
    xFieldPath: dataSource.xFieldPath,
    yFieldPath: dataSource.yFieldPath,
    seriesFieldPath: dataSource.seriesFieldPath,
    parameterBindings: dataSource.parameterBindings,
    timeSeries: dataSource.timeSeries,
    dashboardDateFilter: context.dashboardDateFilter,
    listFilters: context.listFilters,
    routeParams: context.routeParams,
  });
}

export function entityQueryTimeSeriesIsConfigured(
  dataSource: Extract<
    ResolvedChartComponentConfig["dataSource"],
    { type: "entityQuery" }
  >,
): boolean {
  if (!dataSource.timeSeries) {
    return false;
  }
  return dataSource.entityQueryDefinitionId.trim().length > 0;
}
