import { useCallback, useEffect, useMemo, useState } from "react";
import type { UiLayoutDocument, ViewConfig } from "@repo/entities";
import { createDefaultUiLayout } from "@repo/entities";
import { useQueryClient } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { entityCatalogQueryKey } from "../../query/query-client";

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

  const [viewType, setViewType] = useState<"table" | "card" | "compact">(
    "table",
  );
  const [layout, setLayout] = useState<UiLayoutDocument>(() =>
    createDefaultUiLayout(fieldPaths),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [layoutEditorKey, setLayoutEditorKey] = useState(0);

  const filterFieldOptions = useMemo(() => [...fieldPaths], [fieldPaths]);
  const defaultFieldPath = fieldPaths[0] ?? "name";

  useEffect(() => {
    const cardView = uiViews.find((view) => view.type === "card");
    setViewType(listViewType ?? (cardView ? "card" : "table"));

    const listItem = definition.ui.listItem ?? cardView?.layout;
    if (listItem) {
      setLayout(listItem);
      setLayoutEditorKey((current) => current + 1);
      return;
    }

    setLayout(createDefaultUiLayout(fieldPaths));
    setLayoutEditorKey((current) => current + 1);
  }, [definition.ui.listItem, fieldPaths, listViewType, uiViews]);

  const buildViews = useCallback((): readonly ViewConfig[] => {
    const tableView = uiViews.find((view) => view.type === "table");
    const tableViewConfig: ViewConfig = {
      ...(tableView ?? { type: "table", name: "default", fields: fieldPaths }),
      type: "table",
      name: tableView?.name ?? "default",
      fields: fieldPaths,
    };

    if (viewType === "table") {
      return [tableViewConfig];
    }

    const existingCard = uiViews.find((view) => view.type === "card");
    const cardViewConfig: ViewConfig = {
      type: "card",
      name: "card",
      fields: fieldPaths,
      layout,
      ...(existingCard?.metricWidgets
        ? { metricWidgets: existingCard.metricWidgets }
        : {}),
    };

    return [tableViewConfig, cardViewConfig];
  }, [fieldPaths, layout, uiViews, viewType]);

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
    isSaving,
    save,
    layoutEditorKey,
  };
}

export type UseEntityListLayoutEditorResult = ReturnType<
  typeof useEntityListLayoutEditor
>;
