import type { EntityName } from "../../entities/entity-catalog";
import { useEntityListLayoutEditor } from "./use-entity-list-layout-editor";
import { useCustomViewListLayoutEditor } from "./use-custom-view-list-layout-editor";

export function useDesignerListLayoutEditor(
  entityName: EntityName,
  customViewId?: string,
) {
  const entityEditor = useEntityListLayoutEditor(entityName);
  const customViewEditor = useCustomViewListLayoutEditor(customViewId);
  return customViewId ? customViewEditor : entityEditor;
}
