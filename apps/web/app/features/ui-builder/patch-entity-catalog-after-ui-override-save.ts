import {
  mergeEntityUiOverrides,
  type EntityUiOverrideRecord,
  type SerializableEntityDefinition,
} from "@repo/entities";
import type { QueryClient } from "@tanstack/react-query";

import { entityCatalogQueryKey } from "../../query/query-client";

export function patchEntityCatalogAfterUiOverrideSave(
  queryClient: QueryClient,
  entityName: string,
  override: EntityUiOverrideRecord,
): void {
  queryClient.setQueriesData<{
    readonly items: readonly SerializableEntityDefinition[];
  }>({ queryKey: entityCatalogQueryKey }, (current) => {
    if (!current) {
      return current;
    }

    return {
      items: current.items.map((item) =>
        item.name === entityName
          ? mergeEntityUiOverrides(item, override)
          : item,
      ),
    };
  });
}
