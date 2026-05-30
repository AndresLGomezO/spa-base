import type { ComponentType } from "react";
import type { QueryConfig } from "@repo/query-engine";

import type { EntityName } from "../../entities/entity-catalog";
import type { useEntity } from "../../hooks/useEntity";

type EntityListState = Pick<
  ReturnType<typeof useEntity>,
  "items" | "totalCount" | "isLoading" | "error"
>;

interface EntityViewProps {
  readonly entityName: EntityName;
  readonly entityState: EntityListState;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
  readonly onQueryConfigChange: (queryConfig: QueryConfig) => void;
  readonly onRequestDelete?: (id: string) => void;
  readonly onRequestEdit?: (id: string) => void;
}

const viewComponents = new Map<string, ComponentType<EntityViewProps>>();

export function registerViewComponent(
  viewType: string,
  component: ComponentType<EntityViewProps>,
): void {
  viewComponents.set(viewType, component);
}

export function resolveViewComponent(
  viewType: string,
): ComponentType<EntityViewProps> | undefined {
  return viewComponents.get(viewType);
}
