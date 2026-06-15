import { useCallback, useEffect, useState } from "react";
import type {
  DesignLayoutSliceData,
  MetricsRowDesignerSliceData,
} from "@repo/entities";
import { normalizeEntityViews } from "@repo/entities";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { useQueryClient } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { createDefaultMetricRowLayout } from "./create-default-metric-row-layout";
import { createDefaultMetricWidget } from "./create-default-metric-widget";
import { ensureContainerRoot } from "@repo/ui-builder-core";
import { patchEntityCatalogAfterUiOverrideSave } from "./patch-entity-catalog-after-ui-override-save";
import type { MetricWidgetDefinition } from "@repo/entities";

function normalizeWidgetList(
  widgets: readonly MetricWidgetDefinition[],
): MetricWidgetDefinition[] {
  return widgets.map((widget) => ({
    ...widget,
    layout: ensureContainerRoot(widget.layout),
  }));
}

function normalizeMetricRowLayout(layout: UiLayoutDocument): UiLayoutDocument {
  return ensureContainerRoot(layout);
}

function resolveInitialMetricRowLayout(
  existing: UiLayoutDocument | undefined,
): UiLayoutDocument {
  if (existing) {
    return normalizeMetricRowLayout(existing);
  }

  return createDefaultMetricRowLayout();
}

function resolveInitialWidgets(
  existing: readonly MetricWidgetDefinition[] | undefined,
): MetricWidgetDefinition[] {
  if (!existing || existing.length === 0) {
    return [];
  }

  return normalizeWidgetList(existing);
}

export function useEntityMetricsWidgetsEditor(entityName: EntityName) {
  const definition = useEntityDefinition(entityName);
  const queryClient = useQueryClient();
  const uiViews = definition.ui.views;

  const [widgets, setWidgetsState] = useState<MetricWidgetDefinition[]>(() =>
    resolveInitialWidgets(definition.ui.metricWidgets),
  );
  const [metricRowLayout, setMetricRowLayoutState] = useState<UiLayoutDocument>(
    () => resolveInitialMetricRowLayout(definition.ui.metricRowLayout),
  );
  const [selectedWidgetId, setSelectedWidgetId] = useState<string>(() => {
    const initial = resolveInitialWidgets(definition.ui.metricWidgets);
    return initial[0]?.id ?? "";
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const nextWidgets = resolveInitialWidgets(definition.ui.metricWidgets);
    setWidgetsState(nextWidgets);
    setSelectedWidgetId((current) => {
      if (nextWidgets.some((widget) => widget.id === current)) {
        return current;
      }
      return nextWidgets[0]?.id ?? "";
    });
  }, [definition.ui.metricWidgets]);

  useEffect(() => {
    setMetricRowLayoutState(
      resolveInitialMetricRowLayout(definition.ui.metricRowLayout),
    );
  }, [definition.ui.metricRowLayout]);

  useEffect(() => {
    if (widgets.length === 0) {
      if (selectedWidgetId !== "") {
        setSelectedWidgetId("");
      }
      return;
    }

    if (!widgets.some((widget) => widget.id === selectedWidgetId)) {
      setSelectedWidgetId(widgets[0]?.id ?? "");
    }
  }, [widgets, selectedWidgetId]);

  const setWidgets = useCallback((next: readonly MetricWidgetDefinition[]) => {
    const normalized =
      next.length > 0
        ? normalizeWidgetList(next)
        : ([] as MetricWidgetDefinition[]);
    setWidgetsState(normalized);
    setSelectedWidgetId((current) => {
      if (normalized.some((widget) => widget.id === current)) {
        return current;
      }
      return normalized[0]?.id ?? "";
    });
  }, []);

  const setMetricRowLayout = useCallback((layout: UiLayoutDocument) => {
    setMetricRowLayoutState(normalizeMetricRowLayout(layout));
  }, []);

  const selectedWidget = widgets.find(
    (widget) => widget.id === selectedWidgetId,
  );

  const updateWidgetLayout = useCallback(
    (widgetId: string, layout: UiLayoutDocument) => {
      setWidgetsState((current) =>
        current.map((widget) =>
          widget.id === widgetId
            ? {
                ...widget,
                layout: ensureContainerRoot(layout),
              }
            : widget,
        ),
      );
    },
    [],
  );

  const updateSelectedWidgetLayout = useCallback(
    (layout: UiLayoutDocument) => {
      if (!selectedWidgetId) {
        return;
      }
      updateWidgetLayout(selectedWidgetId, layout);
    },
    [selectedWidgetId, updateWidgetLayout],
  );

  const addWidget = useCallback((name: string) => {
    const widget = createDefaultMetricWidget(name);
    setWidgetsState((current) => [...current, widget]);
    setSelectedWidgetId(widget.id);
    return widget.id;
  }, []);

  const removeWidget = useCallback((widgetId: string) => {
    setWidgetsState((current) => {
      const next = current.filter((widget) => widget.id !== widgetId);
      setSelectedWidgetId((selected) => {
        if (selected === widgetId) {
          return next[0]?.id ?? "";
        }
        return selected;
      });
      return next;
    });
  }, []);

  const renameWidget = useCallback((widgetId: string, name: string) => {
    setWidgetsState((current) =>
      current.map((widget) =>
        widget.id === widgetId ? { ...widget, name } : widget,
      ),
    );
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { override } = await putEntityUiOverride(entityName, {
        views: normalizeEntityViews(uiViews),
        ...(definition.ui.listViewType
          ? { listViewType: definition.ui.listViewType }
          : {}),
        ...(definition.ui.mainPageLayout
          ? { mainPage: definition.ui.mainPageLayout }
          : {}),
        ...(definition.ui.recordDetailLayout
          ? { recordDetail: definition.ui.recordDetailLayout }
          : {}),
        metricWidgets: widgets,
        metricRowLayout,
      });
      patchEntityCatalogAfterUiOverrideSave(queryClient, entityName, override);
      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    definition.ui.listViewType,
    definition.ui.mainPageLayout,
    definition.ui.recordDetailLayout,
    entityName,
    metricRowLayout,
    queryClient,
    uiViews,
    widgets,
  ]);

  const exportSlice = useCallback((): MetricsRowDesignerSliceData => {
    return {
      metricWidgets: widgets,
      metricRowLayout,
    };
  }, [metricRowLayout, widgets]);

  const applySlice = useCallback((data: DesignLayoutSliceData) => {
    const slice = data as MetricsRowDesignerSliceData;
    const nextWidgets =
      slice.metricWidgets.length > 0
        ? normalizeWidgetList(slice.metricWidgets)
        : [];
    setWidgetsState(nextWidgets);
    setSelectedWidgetId((current) => {
      if (nextWidgets.some((widget) => widget.id === current)) {
        return current;
      }
      return nextWidgets[0]?.id ?? "";
    });
    setMetricRowLayoutState(normalizeMetricRowLayout(slice.metricRowLayout));
  }, []);

  return {
    entityName,
    definition,
    widgets,
    setWidgets,
    metricRowLayout,
    setMetricRowLayout,
    selectedWidgetId,
    setSelectedWidgetId,
    selectedWidget,
    updateWidgetLayout,
    updateSelectedWidgetLayout,
    addWidget,
    removeWidget,
    renameWidget,
    isSaving,
    save,
    exportSlice,
    applySlice,
  };
}

export type UseEntityMetricsWidgetsEditorResult = ReturnType<
  typeof useEntityMetricsWidgetsEditor
>;
