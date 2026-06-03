import { useCallback, useEffect, useMemo, useState } from "react";
import type { ViewConfig, ViewMetricWidget } from "@repo/entities";
import {
  clampMetricWidgetsToStrip,
  metricStripColumnCount,
  normalizeEntityViews,
} from "@repo/entities";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { useQueryClient } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { patchEntityCatalogAfterUiOverrideSave } from "./patch-entity-catalog-after-ui-override-save";
import {
  createDefaultMetricStripLayout,
  metricStripLayoutFromTableView,
  viewMetricWidgetsFromView,
} from "../../components/metrics/metric-widgets-builder-state.js";

export function useEntityMetricsLayoutEditor(entityName: EntityName) {
  const definition = useEntityDefinition(entityName);
  const queryClient = useQueryClient();
  const uiViews = definition.ui.views;

  const [metricStripLayout, setMetricStripLayout] = useState<UiLayoutDocument>(
    () => createDefaultMetricStripLayout(),
  );
  const [metricWidgets, setMetricWidgets] = useState<
    readonly ViewMetricWidget[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);

  const columnCount = metricStripColumnCount(metricStripLayout);

  const filterFieldOptions = useMemo(
    () =>
      Object.keys(definition.fields).filter(
        (field) => definition.fields[field]?.type !== "document",
      ),
    [definition.fields],
  );

  useEffect(() => {
    const tableView = uiViews.find((view) => view.type === "table");
    const layout = metricStripLayoutFromTableView(
      tableView?.type === "table" ? tableView.metricStripLayout : undefined,
    );
    setMetricStripLayout(layout);
    setMetricWidgets(
      viewMetricWidgetsFromView(tableView?.metricWidgets, layout),
    );
  }, [uiViews]);

  const setMetricStripLayoutWithClamp = useCallback(
    (layout: UiLayoutDocument) => {
      setMetricStripLayout(layout);
      setMetricWidgets((current) =>
        clampMetricWidgetsToStrip(current, metricStripColumnCount(layout)),
      );
    },
    [],
  );

  const buildViews = useCallback((): readonly ViewConfig[] => {
    return uiViews.map((view) => {
      if (view.type !== "table") {
        return view;
      }
      const {
        metricWidgets: _widgets,
        metricStripLayout: _layout,
        ...rest
      } = view;
      void _widgets;
      void _layout;

      const hasWidgets = metricWidgets.length > 0;

      return {
        ...rest,
        type: "table" as const,
        ...(hasWidgets ? { metricWidgets } : {}),
        metricStripLayout,
      };
    });
  }, [metricStripLayout, metricWidgets, uiViews]);

  const save = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const views = buildViews();
      const { override } = await putEntityUiOverride(entityName, {
        views: normalizeEntityViews(views),
        ...(definition.ui.listViewType
          ? { listViewType: definition.ui.listViewType }
          : {}),
        ...(definition.ui.mainPageLayout
          ? { mainPage: definition.ui.mainPageLayout }
          : {}),
      });
      patchEntityCatalogAfterUiOverrideSave(queryClient, entityName, override);
      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    buildViews,
    definition.ui.listViewType,
    definition.ui.mainPageLayout,
    entityName,
    queryClient,
  ]);

  return {
    entityName,
    definition,
    filterFieldOptions,
    metricStripLayout,
    setMetricStripLayout: setMetricStripLayoutWithClamp,
    metricWidgets,
    setMetricWidgets,
    columnCount,
    isSaving,
    save,
  };
}

export type UseEntityMetricsLayoutEditorResult = ReturnType<
  typeof useEntityMetricsLayoutEditor
>;
