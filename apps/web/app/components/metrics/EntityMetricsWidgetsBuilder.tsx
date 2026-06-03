import { useQuery } from "@tanstack/react-query";
import { Button, Text } from "@repo/ui";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type {
  SerializableEntityDefinition,
  ViewMetricWidget,
} from "@repo/entities";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";

import { useAnyPermission } from "../../auth/useAnyPermission.js";
import { usePermission } from "../../auth/usePermission.js";
import { listMetricDefinitions } from "../../lib/api-client.js";
import {
  allocateMetricWidgetId,
  createDefaultKpiWidget,
  createDefaultSeriesWidget,
  metricStripColumnCount,
  migrateMetricWidgetLayout,
  nextWidgetPlacement,
} from "./metric-widgets-builder-state.js";
import { metricWidgetPlacementForEditor } from "./metric-strip-grid-styles.js";
import { MetricWidgetEditorPanel } from "./MetricWidgetEditorPanel.js";

function reorderWidgetInColumn1(
  widgets: readonly ViewMetricWidget[],
  index: number,
  direction: -1 | 1,
  columnCount: number,
): readonly ViewMetricWidget[] {
  const placement = metricWidgetPlacementForEditor(
    widgets[index]!,
    index,
    columnCount,
  );
  if (placement.column !== 1) {
    return widgets;
  }

  const column1Entries = widgets
    .map((widget, widgetIndex) => ({
      widget,
      widgetIndex,
      placement: metricWidgetPlacementForEditor(
        widget,
        widgetIndex,
        columnCount,
      ),
    }))
    .filter((entry) => entry.placement.column === 1)
    .sort(
      (left, right) => (left.placement.row ?? 1) - (right.placement.row ?? 1),
    );

  const position = column1Entries.findIndex(
    (entry) => entry.widgetIndex === index,
  );
  const target = position + direction;
  if (position < 0 || target < 0 || target >= column1Entries.length) {
    return widgets;
  }

  const current = column1Entries[position]!;
  const swap = column1Entries[target]!;
  const currentRow = current.placement.row ?? 1;
  const swapRow = swap.placement.row ?? 1;

  return widgets.map((widget, widgetIndex) => {
    if (widgetIndex === current.widgetIndex) {
      return {
        ...widget,
        placement: { ...current.placement, row: swapRow },
      };
    }
    if (widgetIndex === swap.widgetIndex) {
      return {
        ...widget,
        placement: { ...swap.placement, row: currentRow },
      };
    }
    return widget;
  });
}

interface EntityMetricsWidgetsBuilderProps {
  readonly widgets: readonly ViewMetricWidget[];
  readonly metricStripLayout: UiLayoutDocument;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly filterFieldOptions: readonly string[];
  readonly onChange: (widgets: readonly ViewMetricWidget[]) => void;
}

export function EntityMetricsWidgetsBuilder({
  widgets,
  metricStripLayout,
  entityDefinition,
  filterFieldOptions,
  onChange,
}: EntityMetricsWidgetsBuilderProps) {
  const { t } = useTranslation("common");
  const canConfigureWidgets = useAnyPermission(
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );
  const canListDefinitions = usePermission("metricDefinition.read");
  const columnCount = metricStripColumnCount(metricStripLayout);

  const definitionsQuery = useQuery({
    queryKey: ["metric-definitions", "active"],
    queryFn: async () => {
      const result = await listMetricDefinitions();
      return result.items.filter((item) => item.status === "ACTIVE");
    },
    enabled: canConfigureWidgets && canListDefinitions,
  });

  const definitions = useMemo(
    () =>
      (definitionsQuery.data ?? []).filter(
        (item) => item.sourceModel === entityDefinition.name,
      ),
    [definitionsQuery.data, entityDefinition.name],
  );
  const defaultMetricId = definitions[0]?.id ?? "";

  if (!canConfigureWidgets) {
    return (
      <Text variant="muted" className="text-sm">
        {t("entity.viewSettings.metrics.forbidden")}
      </Text>
    );
  }

  function addWidget(display: "kpi" | "series") {
    if (!defaultMetricId) {
      return;
    }
    const id = allocateMetricWidgetId(widgets);
    const placement = nextWidgetPlacement(widgets, metricStripLayout);
    const base =
      display === "kpi"
        ? { ...createDefaultKpiWidget(defaultMetricId, placement), id }
        : { ...createDefaultSeriesWidget(defaultMetricId, placement), id };
    onChange([...widgets, migrateMetricWidgetLayout(base)]);
  }

  function removeWidget(id: string) {
    onChange(widgets.filter((widget) => widget.id !== id));
  }

  function updateWidget(id: string, widget: ViewMetricWidget) {
    onChange(widgets.map((entry) => (entry.id === id ? widget : entry)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Text className="font-semibold">
          {t("entity.viewSettings.metrics.title")}
        </Text>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!defaultMetricId}
            onClick={() => addWidget("kpi")}
          >
            <Plus className="mr-1 size-4" />
            {t("entity.viewSettings.metrics.addKpi")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!defaultMetricId}
            onClick={() => addWidget("series")}
          >
            <Plus className="mr-1 size-4" />
            {t("entity.viewSettings.metrics.addSeries")}
          </Button>
        </div>
      </div>

      {definitionsQuery.isLoading ? (
        <Text variant="muted" className="text-sm">
          {t("metrics.widget.loading")}
        </Text>
      ) : null}

      {definitions.length === 0 && !definitionsQuery.isLoading ? (
        <Text variant="muted" className="text-sm">
          {t("designLayout.metricsNoDefinitions")}
        </Text>
      ) : null}

      {widgets.length === 0 && definitions.length > 0 ? (
        <Text variant="muted" className="text-sm">
          {t("entity.viewSettings.metrics.addKpi")}
        </Text>
      ) : null}

      {widgets.map((widget, index) => (
        <div
          key={widget.id}
          className="border-border flex flex-col gap-3 rounded-lg border p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <Text className="text-sm font-medium">
              {widget.display === "kpi"
                ? t("entity.viewSettings.metrics.kpiWidget")
                : t("entity.viewSettings.metrics.seriesWidget")}
            </Text>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={index === 0}
                aria-label={t("designLayout.moveWidgetUp")}
                onClick={() =>
                  onChange(
                    reorderWidgetInColumn1(widgets, index, -1, columnCount),
                  )
                }
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={index === widgets.length - 1}
                aria-label={t("designLayout.moveWidgetDown")}
                onClick={() =>
                  onChange(
                    reorderWidgetInColumn1(widgets, index, 1, columnCount),
                  )
                }
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeWidget(widget.id)}
              >
                <Trash2 className="text-destructive size-4" />
              </Button>
            </div>
          </div>

          <MetricWidgetEditorPanel
            widget={widget}
            widgets={widgets}
            widgetIndex={index}
            columnCount={columnCount}
            entityDefinition={entityDefinition}
            filterFieldOptions={filterFieldOptions}
            onChange={(next) => updateWidget(widget.id, next)}
          />
        </div>
      ))}
    </div>
  );
}
