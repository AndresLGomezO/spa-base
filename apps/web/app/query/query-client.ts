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
): readonly ["entity", string, unknown] {
  return ["entity", entityName, queryConfig ?? null];
}

export function entityRecordQueryKey(
  entityName: string,
  id: string,
): readonly ["entity", string, "record", string] {
  return ["entity", entityName, "record", id];
}
