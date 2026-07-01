import type { EntityName } from "../../entities/entity-catalog";
import { useEntityMetricsWidgetsEditor } from "./use-entity-metrics-widgets-editor";
import { useCustomViewMetricsWidgetsEditor } from "./use-custom-view-metrics-widgets-editor";

export function useDesignerMetricsWidgetsEditor(
  entityName: EntityName,
  customViewId?: string,
) {
  const entityEditor = useEntityMetricsWidgetsEditor(entityName);
  const customViewEditor = useCustomViewMetricsWidgetsEditor(customViewId);
  return customViewId ? customViewEditor : entityEditor;
}
