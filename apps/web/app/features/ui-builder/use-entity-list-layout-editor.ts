import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  UiLayoutDocument,
  ViewConfig,
  ViewMetricWidget,
} from "@repo/entities";
import { createDefaultUiLayout } from "@repo/entities";
import { useQueryClient } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { entityCatalogQueryKey } from "../../query/query-client";
import { viewMetricWidgetsFromView } from "../../components/metrics/metric-widgets-builder-state.js";

function getDefaultFieldPaths(
  definition: ReturnType<typeof useEntityDefinition>,
) {
  return Object.keys(definition.fields).filter(
    (field) => definition.fields[field]?.type !== "document",
  );
}

export function useEntityListLayoutEditor(entityName: EntityName) {
  const definition = useEntityDefinition(entityName);
  const queryClient = useQueryClient();
  const fieldPaths = useMemo(
    () => getDefaultFieldPaths(definition),
    [definition],
  );
  const uiViews = definition.ui.views;
  const listViewType = definition.ui.listViewType;

  const [viewType, setViewType] = useState<"table" | "card" | "compact">("table");
  const [layout, setLayout] = useState<UiLayoutDocument>(() =>
    createDefaultUiLayout(fieldPaths),
  );
  const [tableMetricWidgets, setTableMetricWidgets] = useState<
    readonly ViewMetricWidget[]
  >([]);
  const [cardMetricWidgets, setCardMetricWidgets] = useState<
    readonly ViewMetricWidget[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [layoutEditorKey, setLayoutEditorKey] = useState(0);

  const filterFieldOptions = useMemo(() => [...fieldPaths], [fieldPaths]);
  const defaultFieldPath = fieldPaths[0] ?? "name";

  useEffect(() => {
    const tableView = uiViews.find((view) => view.type === "table");
    const cardView = uiViews.find((view) => view.type === "card");
    setTableMetricWidgets(viewMetricWidgetsFromView(tableView?.metricWidgets));
    setCardMetricWidgets(viewMetricWidgetsFromView(cardView?.metricWidgets));
    setViewType(listViewType ?? (cardView ? "card" : "table"));

    const listItem =
      definition.ui.listItem ?? cardView?.layout;
    if (listItem) {
      setLayout(listItem);
      setLayoutEditorKey((current) => current + 1);
      return;
    }

    setLayout(createDefaultUiLayout(fieldPaths));
    setLayoutEditorKey((current) => current + 1);
  }, [definition.ui.listItem, fieldPaths, listViewType, uiViews]);

  const buildViews = useCallback((): readonly ViewConfig[] => {
    const tableView: ViewConfig = {
      type: "table",
      name: "default",
      fields: fieldPaths,
      ...(tableMetricWidgets.length > 0
        ? { metricWidgets: tableMetricWidgets }
        : {}),
    };

    if (viewType === "table") {
      return [tableView];
    }

    const cardViewConfig = {
      type: "card" as const,
      name: "card",
      fields: fieldPaths,
      layout,
      ...(cardMetricWidgets.length > 0
        ? { metricWidgets: cardMetricWidgets }
        : {}),
    };

    return [tableView, cardViewConfig];
  }, [cardMetricWidgets, fieldPaths, layout, tableMetricWidgets, viewType]);

  const save = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      await putEntityUiOverride(entityName, {
        views: buildViews(),
        listViewType: viewType,
        listItem: layout,
      });
      await queryClient.invalidateQueries({
        queryKey: entityCatalogQueryKey,
      });
      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [buildViews, entityName, queryClient, viewType]);

  return {
    entityName,
    definition,
    fieldPaths,
    filterFieldOptions,
    defaultFieldPath,
    viewType,
    setViewType,
    layout,
    setLayout,
    tableMetricWidgets,
    setTableMetricWidgets,
    cardMetricWidgets,
    setCardMetricWidgets,
    isSaving,
    save,
    layoutEditorKey,
  };
}

export type UseEntityListLayoutEditorResult = ReturnType<
  typeof useEntityListLayoutEditor
>;
