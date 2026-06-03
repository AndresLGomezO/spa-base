import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  UiLayoutDocument,
  ViewConfig,
  ViewMetricWidget,
} from "@repo/entities";
import {
  createDefaultMainPageLayout,
  normalizeEntityViews,
} from "@repo/entities";
import { useQueryClient } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { entityCatalogQueryKey } from "../../query/query-client";
import { viewMetricWidgetsFromView } from "../../components/metrics/metric-widgets-builder-state.js";

export function useEntityMainPageLayoutEditor(entityName: EntityName) {
  const definition = useEntityDefinition(entityName);
  const queryClient = useQueryClient();
  const uiViews = definition.ui.views;

  const [layout, setLayout] = useState<UiLayoutDocument>(() =>
    createDefaultMainPageLayout(),
  );
  const [metricWidgets, setMetricWidgets] = useState<
    readonly ViewMetricWidget[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [layoutEditorKey, setLayoutEditorKey] = useState(0);

  const filterFieldOptions = useMemo(
    () =>
      Object.keys(definition.fields).filter(
        (field) => definition.fields[field]?.type !== "document",
      ),
    [definition.fields],
  );

  useEffect(() => {
    const tableView = uiViews.find((view) => view.type === "table");
    setMetricWidgets(viewMetricWidgetsFromView(tableView?.metricWidgets));

    const existing = definition.ui.mainPageLayout;
    if (existing) {
      setLayout(existing);
      setLayoutEditorKey((current) => current + 1);
      return;
    }
    setLayout(createDefaultMainPageLayout());
    setLayoutEditorKey((current) => current + 1);
  }, [definition.ui.mainPageLayout, uiViews]);

  const buildViews = useCallback((): readonly ViewConfig[] => {
    return uiViews.map((view) => {
      if (view.type !== "table") {
        return view;
      }
      const { metricWidgets: _existing, ...rest } = view;
      return metricWidgets.length > 0
        ? { ...rest, type: "table" as const, metricWidgets }
        : rest;
    });
  }, [metricWidgets, uiViews]);

  const save = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const views = buildViews();
      await putEntityUiOverride(entityName, {
        views: normalizeEntityViews(views),
        ...(definition.ui.listViewType
          ? { listViewType: definition.ui.listViewType }
          : {}),
        mainPage: layout,
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
  }, [buildViews, definition.ui.listViewType, entityName, layout, queryClient]);

  return {
    entityName,
    definition,
    filterFieldOptions,
    layout,
    setLayout,
    metricWidgets,
    setMetricWidgets,
    isSaving,
    save,
    layoutEditorKey,
  };
}

export type UseEntityMainPageLayoutEditorResult = ReturnType<
  typeof useEntityMainPageLayoutEditor
>;
