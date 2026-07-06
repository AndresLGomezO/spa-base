import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const entityCatalogQueryKey = ["entities"] as const;

export function entityCatalogQueryKeyForTenant(
  tenantId: string,
): readonly ["entities", string] {
  return ["entities", tenantId];
}

export const entityCategoriesQueryKey = ["entity-categories"] as const;

export function entityCategoriesQueryKeyForTenant(
  tenantId: string,
): readonly ["entity-categories", string] {
  return ["entity-categories", tenantId];
}

export function entityListQueryKey(
  entityName: string,
  queryConfig?: unknown,
  page?: number,
): readonly ["entity", string, unknown, number | null] {
  return ["entity", entityName, queryConfig ?? null, page ?? null];
}

export function entityRecordQueryKey(
  entityName: string,
  id: string,
): readonly ["entity", string, "record", string] {
  return ["entity", entityName, "record", id];
}

export function metricRowQueryKey(
  metricDefinitionId: string,
  query: unknown,
): readonly ["metric-row", string, unknown] {
  return ["metric-row", metricDefinitionId, query];
}

export function entityQueryResultsQueryKey(
  queryId: string,
  contextKey?: string | null,
): readonly ["entity-query-results", string, string | null] {
  return ["entity-query-results", queryId, contextKey ?? null];
}

export function metricEvaluateQueryKey(
  metricDefinitionId: string,
  parameters: Readonly<Record<string, string | number | boolean>> | null,
): readonly [
  "metric-evaluate",
  string,
  Readonly<Record<string, string | number | boolean>> | null,
] {
  return ["metric-evaluate", metricDefinitionId, parameters];
}

export function entityQueryRowsQueryKey(
  fetchKey: string,
): readonly ["entity-query-rows", string] {
  return ["entity-query-rows", fetchKey];
}
