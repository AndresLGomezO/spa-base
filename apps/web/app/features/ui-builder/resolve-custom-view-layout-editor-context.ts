import { useMemo } from "react";

import type { CustomViewRecord } from "@repo/custom-views";
import type {
  EntityCatalogEntry,
  EntityName,
} from "../../entities/entity-catalog";
import { useCustomViewCatalog } from "../../custom-views/custom-view-catalog-context";
import { useCustomViewPageDefinition } from "../../custom-views/use-custom-view-page-definition";

interface CustomViewLayoutEditorContext {
  readonly customView: CustomViewRecord | undefined;
  readonly entityName: EntityName;
  readonly definition: EntityCatalogEntry | null;
}

export function useCustomViewLayoutEditorContext(
  viewId?: string,
): CustomViewLayoutEditorContext {
  const { getByViewId } = useCustomViewCatalog();
  const customView = viewId ? getByViewId(viewId) : undefined;
  const definition = useCustomViewPageDefinition(customView);
  const entityName = (customView?.sourceEntity ?? "") as EntityName;

  return useMemo(
    () => ({
      customView,
      entityName,
      definition,
    }),
    [customView, definition, entityName],
  );
}
