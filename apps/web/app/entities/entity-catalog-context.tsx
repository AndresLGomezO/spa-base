import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { listEntities } from "../lib/api-client";
import { entityCatalogQueryKey, queryClient } from "../query/query-client";
import {
  getEntityDefinition,
  isEntityName,
  type EntityCatalogEntry,
  type EntityName,
} from "./entity-catalog";

interface EntityCatalogContextValue {
  readonly items: readonly EntityCatalogEntry[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly getDefinition: (name: EntityName) => EntityCatalogEntry;
  readonly isKnownEntity: (name: string) => name is EntityName;
}

const EntityCatalogContext = createContext<EntityCatalogContextValue | null>(
  null,
);

function EntityCatalogProviderFromQuery({
  children,
}: {
  readonly children: ReactNode;
}) {
  const catalogQuery = useQuery({
    queryKey: entityCatalogQueryKey,
    queryFn: listEntities,
    staleTime: 30_000,
  });

  const isLoading = catalogQuery.isLoading;
  const error =
    catalogQuery.error instanceof Error
      ? catalogQuery.error.message
      : catalogQuery.error
        ? "Failed to load entity catalog."
        : null;

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: entityCatalogQueryKey });
  }, []);

  const value = useMemo<EntityCatalogContextValue>(() => {
    const items = catalogQuery.data?.items ?? [];

    return {
      items,
      isLoading,
      error,
      refresh,
      getDefinition: (name) => getEntityDefinition(name, items),
      isKnownEntity: (name): name is EntityName => isEntityName(name, items),
    };
  }, [catalogQuery.data?.items, error, isLoading, refresh]);

  return (
    <EntityCatalogContext.Provider value={value}>
      {children}
    </EntityCatalogContext.Provider>
  );
}

export function EntityCatalogProvider({
  children,
  value: valueOverride,
}: {
  readonly children: ReactNode;
  readonly value?: EntityCatalogContextValue;
}) {
  if (valueOverride) {
    return (
      <EntityCatalogContext.Provider value={valueOverride}>
        {children}
      </EntityCatalogContext.Provider>
    );
  }

  return (
    <EntityCatalogProviderFromQuery>{children}</EntityCatalogProviderFromQuery>
  );
}

export function useEntityCatalog(): EntityCatalogContextValue {
  const context = useContext(EntityCatalogContext);
  if (!context) {
    throw new Error(
      "useEntityCatalog must be used within EntityCatalogProvider.",
    );
  }
  return context;
}

export function useEntityDefinition(name: EntityName): EntityCatalogEntry {
  const { getDefinition } = useEntityCatalog();
  return getDefinition(name);
}
