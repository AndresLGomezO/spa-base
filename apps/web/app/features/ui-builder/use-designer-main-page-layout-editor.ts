import type { EntityName } from "../../entities/entity-catalog";
import { useEntityMainPageLayoutEditor } from "./use-entity-main-page-layout-editor";
import { useCustomViewMainPageLayoutEditor } from "./use-custom-view-main-page-layout-editor";

export function useDesignerMainPageLayoutEditor(
  entityName: EntityName,
  customViewId?: string,
) {
  const entityEditor = useEntityMainPageLayoutEditor(entityName);
  const customViewEditor = useCustomViewMainPageLayoutEditor(customViewId);
  return customViewId ? customViewEditor : entityEditor;
}

export type UseDesignerMainPageLayoutEditorResult = ReturnType<
  typeof useDesignerMainPageLayoutEditor
>;
