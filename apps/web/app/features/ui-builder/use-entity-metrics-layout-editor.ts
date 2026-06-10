import { useCallback, useEffect, useState } from "react";
import type {
  DesignLayoutSliceData,
  MetricStripSliceData,
  ViewConfig,
} from "@repo/entities";
import {
  createDefaultMetricStripLayout,
  metricStripHasContent,
  metricStripLayoutFromView,
  normalizeEntityViews,
} from "@repo/entities";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { useQueryClient } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { patchEntityCatalogAfterUiOverrideSave } from "./patch-entity-catalog-after-ui-override-save";

export function useEntityMetricsLayoutEditor(entityName: EntityName) {
  const definition = useEntityDefinition(entityName);
  const queryClient = useQueryClient();
  const uiViews = definition.ui.views;

  const [metricStripLayout, setMetricStripLayout] = useState<UiLayoutDocument>(
    () => createDefaultMetricStripLayout(),
  );
  const [isSaving, setIsSaving] = useState(false);

  const filterFieldOptions = Object.keys(definition.fields).filter(
    (field) => definition.fields[field]?.type !== "document",
  );

  useEffect(() => {
    const tableView = uiViews.find((view) => view.type === "table");
    setMetricStripLayout(
      metricStripLayoutFromView(
        tableView?.type === "table" ? tableView.metricStripLayout : undefined,
      ),
    );
  }, [uiViews]);

  const buildViews = useCallback((): readonly ViewConfig[] => {
    return uiViews.map((view) => {
      if (view.type !== "table") {
        return view;
      }
      const { metricStripLayout: _layout, ...rest } = view;
      void _layout;

      return {
        ...rest,
        type: "table" as const,
        ...(metricStripHasContent(metricStripLayout)
          ? { metricStripLayout }
          : {}),
      };
    });
  }, [metricStripLayout, uiViews]);

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

  const exportSlice = useCallback((): MetricStripSliceData => {
    return { metricStripLayout };
  }, [metricStripLayout]);

  const applySlice = useCallback((data: DesignLayoutSliceData) => {
    setMetricStripLayout((data as MetricStripSliceData).metricStripLayout);
  }, []);

  return {
    entityName,
    definition,
    filterFieldOptions,
    metricStripLayout,
    setMetricStripLayout,
    isSaving,
    save,
    exportSlice,
    applySlice,
  };
}

export type UseEntityMetricsLayoutEditorResult = ReturnType<
  typeof useEntityMetricsLayoutEditor
>;
