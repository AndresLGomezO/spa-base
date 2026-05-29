import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { listEntities } from "../lib/api-client";
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

export function EntityCatalogProvider({
  children,
  value: valueOverride,
}: {
  readonly children: ReactNode;
  readonly value?: EntityCatalogContextValue;
}) {
  const [items, setItems] = useState<readonly EntityCatalogEntry[]>(
    valueOverride?.items ?? [],
  );
  const [isLoading, setIsLoading] = useState(valueOverride ? false : true);
  const [error, setError] = useState<string | null>(
    valueOverride?.error ?? null,
  );

  const refresh = useCallback(async () => {
    if (valueOverride) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await listEntities();
      setItems(result.items);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load entity catalog.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [valueOverride]);

  useEffect(() => {
    if (valueOverride) {
      return;
    }
    void refresh();
  }, [refresh, valueOverride]);

  const value = useMemo<EntityCatalogContextValue>(
    () =>
      valueOverride ?? {
        items,
        isLoading,
        error,
        refresh,
        getDefinition: (name) => getEntityDefinition(name, items),
        isKnownEntity: (name): name is EntityName => isEntityName(name, items),
      },
    [error, isLoading, items, refresh, valueOverride],
  );

  return (
    <EntityCatalogContext.Provider value={value}>
      {children}
    </EntityCatalogContext.Provider>
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
