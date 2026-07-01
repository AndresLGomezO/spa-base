import { useQuery } from "@tanstack/react-query";

import { getAccessibleEntityDefinition } from "../lib/api-client";
import { fetchWithTenantNotResolvedRetry } from "../lib/fetch-with-tenant-not-resolved-retry";
import {
  tryGetEntityDefinition,
  type EntityCatalogEntry,
} from "../entities/entity-catalog";
import { useEntityCatalog } from "../entities/entity-catalog-context";

function entityDefinitionByNameQueryKey(
  entityName: string,
  tenantScoped = true,
) {
  return ["entity-definition-by-name", entityName, tenantScoped] as const;
}

export function useCustomViewSourceDefinition(entityName: string | undefined): {
  readonly definition: EntityCatalogEntry | undefined;
  readonly isLoading: boolean;
  readonly error: string | null;
} {
  const {
    items,
    isLoading: isCatalogLoading,
    error: catalogError,
  } = useEntityCatalog();

  const fromCatalog = entityName
    ? tryGetEntityDefinition(entityName, items)
    : undefined;

  const fetchQuery = useQuery({
    queryKey: entityDefinitionByNameQueryKey(entityName ?? ""),
    queryFn: async (): Promise<EntityCatalogEntry> =>
      fetchWithTenantNotResolvedRetry(() =>
        getAccessibleEntityDefinition(entityName!),
      ),
    enabled: Boolean(entityName) && !isCatalogLoading && !fromCatalog,
    staleTime: 30_000,
  });

  if (!entityName) {
    return { definition: undefined, isLoading: false, error: null };
  }

  if (fromCatalog) {
    return {
      definition: fromCatalog,
      isLoading: isCatalogLoading,
      error: catalogError,
    };
  }

  if (isCatalogLoading) {
    return { definition: undefined, isLoading: true, error: catalogError };
  }

  return {
    definition: fetchQuery.data,
    isLoading: fetchQuery.isLoading,
    error:
      fetchQuery.error instanceof Error
        ? fetchQuery.error.message
        : fetchQuery.error
          ? "Failed to load entity definition."
          : catalogError,
  };
}
