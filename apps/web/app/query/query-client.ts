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

export function metricDefinitionQueryKey(
  metricDefinitionId: string,
): readonly ["metric-definition", string] {
  return ["metric-definition", metricDefinitionId];
}

export function metricRowQueryKey(
  metricDefinitionId: string,
  query: unknown,
): readonly ["metric-row", string, unknown] {
  return ["metric-row", metricDefinitionId, query];
}

export function metricBatchQueryKey(
  metricDefinitionId: string,
  queries: unknown,
): readonly ["metric-batch", string, unknown] {
  return ["metric-batch", metricDefinitionId, queries];
}
