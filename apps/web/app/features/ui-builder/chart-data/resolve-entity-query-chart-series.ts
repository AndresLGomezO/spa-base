import type { ResolvedChartComponentConfig } from "@repo/ui-builder-core";
import type { ChartRenderSeries } from "@repo/ui-charts";

import type { EntityCatalogEntry } from "../../../entities/entity-catalog.js";
import { executeEntityQueryDefinition } from "../execute-entity-query-definition.js";
import type { PageFilterContext } from "../../../lib/metric-binding-resolution.js";
import { getEntityQueryDefinition } from "../../../lib/api-client.js";
import {
  groupPointsBySeries,
  mapStaticPointsToRenderSeries,
} from "./map-chart-render-series.js";

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

function coerceChartX(value: unknown): string | number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value ?? "");
}

function coerceChartY(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function resolveEntityQueryChartSeries(
  dataSource: Extract<
    ResolvedChartComponentConfig["dataSource"],
    { type: "entityQuery" }
  >,
  catalog: readonly EntityCatalogEntry[],
  context: PageFilterContext,
  seriesStyles: ResolvedChartComponentConfig["series"],
): Promise<readonly ChartRenderSeries[]> {
  const definition = await getEntityQueryDefinition(
    dataSource.entityQueryDefinitionId,
  );
  const items = await executeEntityQueryDefinition(definition, catalog, {
    parameterBindings: dataSource.parameterBindings,
    context,
  });

  const points = items.flatMap((item) => {
    const y = coerceChartY(readFieldValue(item, dataSource.yFieldPath));
    if (y === null) {
      return [];
    }
    const x = coerceChartX(readFieldValue(item, dataSource.xFieldPath));
    const seriesId = dataSource.seriesFieldPath
      ? String(readFieldValue(item, dataSource.seriesFieldPath) ?? "default")
      : undefined;
    return [{ x, y, seriesId }];
  });

  if (dataSource.seriesFieldPath) {
    return groupPointsBySeries(points, seriesStyles);
  }

  return mapStaticPointsToRenderSeries(points, seriesStyles);
}

export function buildEntityQueryChartKey(
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
    dashboardDateFilter: context.dashboardDateFilter,
    listFilters: context.listFilters,
    routeParams: context.routeParams,
  });
}
