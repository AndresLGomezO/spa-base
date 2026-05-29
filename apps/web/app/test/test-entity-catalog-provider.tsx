import { useMemo, type ReactNode } from "react";

import {
  getEntityDefinition,
  isEntityName,
  type EntityCatalogEntry,
  type EntityName,
} from "../entities/entity-catalog";
import { EntityCatalogProvider } from "../entities/entity-catalog-context";
import { MOCK_ENTITY_CATALOG } from "./entity-catalog-fixtures";

interface TestEntityCatalogProviderProps {
  readonly children: ReactNode;
  readonly items?: readonly EntityCatalogEntry[];
}

export function TestEntityCatalogProvider({
  children,
  items = MOCK_ENTITY_CATALOG,
}: TestEntityCatalogProviderProps) {
  const value = useMemo(
    () => ({
      items,
      isLoading: false,
      error: null,
      refresh: async () => undefined,
      getDefinition: (name: EntityName) => getEntityDefinition(name, items),
      isKnownEntity: (name: string): name is EntityName =>
        isEntityName(name, items),
    }),
    [items],
  );

  return (
    <EntityCatalogProvider value={value}>{children}</EntityCatalogProvider>
  );
}
