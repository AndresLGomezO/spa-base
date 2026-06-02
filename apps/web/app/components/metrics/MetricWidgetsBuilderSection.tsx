import { useQuery } from "@tanstack/react-query";
import { Button, Text } from "@repo/ui";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { ViewMetricWidget } from "@repo/entities";
import type { SerializableEntityDefinition } from "@repo/entities";

import { usePermission } from "../../auth/usePermission.js";
import { listMetricDefinitions } from "../../lib/api-client.js";
import {
  allocateMetricWidgetId,
  createEmptyMetricBindings,
  createDefaultKpiWidget,
  createDefaultSeriesWidget,
} from "./metric-widgets-builder-state.js";
import { MetricBindingsEditor } from "./MetricBindingsEditor.js";

const SELECT_CLASS =
  "border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

interface MetricWidgetsBuilderSectionProps {
  readonly widgets: readonly ViewMetricWidget[];
  readonly entityDefinition: SerializableEntityDefinition;
  readonly filterFieldOptions: readonly string[];
  readonly onChange: (widgets: readonly ViewMetricWidget[]) => void;
}

export function MetricWidgetsBuilderSection({
  widgets,
  entityDefinition,
  filterFieldOptions,
  onChange,
}: MetricWidgetsBuilderSectionProps) {
  const { t } = useTranslation("common");
  const canReadMetrics = usePermission("metricValue.read");

  const definitionsQuery = useQuery({
    queryKey: ["metric-definitions", "active"],
    queryFn: async () => {
      const result = await listMetricDefinitions();
      return result.items.filter((item) => item.status === "ACTIVE");
    },
    enabled: canReadMetrics,
  });

  const definitions = useMemo(
    () => definitionsQuery.data ?? [],
    [definitionsQuery.data],
  );
  const defaultMetricId = definitions[0]?.id ?? "";

  const definitionById = useMemo(
    () => new Map(definitions.map((definition) => [definition.id, definition])),
    [definitions],
  );

  if (!canReadMetrics) {
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
    const next =
      display === "kpi"
        ? { ...createDefaultKpiWidget(defaultMetricId), id }
        : { ...createDefaultSeriesWidget(defaultMetricId), id };
    onChange([...widgets, next]);
  }

  function removeWidget(id: string) {
    onChange(widgets.filter((widget) => widget.id !== id));
  }

  function updateWidget(id: string, patch: Partial<ViewMetricWidget>) {
    onChange(
      widgets.map((widget) =>
        widget.id === id
          ? ({ ...widget, ...patch } as ViewMetricWidget)
          : widget,
      ),
    );
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
          {t("entity.viewSettings.metrics.noDefinitions")}
        </Text>
      ) : null}

      {widgets.map((widget) => {
        const definition = definitionById.get(widget.metricDefinitionId);

        return (
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
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeWidget(widget.id)}
              >
                <Trash2 className="text-destructive size-4" />
              </Button>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">
                {t("entity.viewSettings.metrics.definition")}
              </span>
              <select
                className={SELECT_CLASS}
                value={widget.metricDefinitionId}
                onChange={(event) =>
                  updateWidget(widget.id, {
                    metricDefinitionId: event.target.value,
                  })
                }
              >
                {definitions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            {definition ? (
              widget.display === "kpi" ? (
                <MetricBindingsEditor
                  metric={definition}
                  bindings={{
                    groupBindings: widget.groupBindings,
                    dimensionBindings: widget.dimensionBindings,
                  }}
                  entityDefinition={entityDefinition}
                  filterFieldOptions={filterFieldOptions}
                  onChange={(bindings) => updateWidget(widget.id, bindings)}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {widget.buckets.map((bucket, bucketIndex) => (
                    <div
                      key={`${widget.id}-bucket-${bucketIndex}`}
                      className="border-border rounded-md border p-2"
                    >
                      <Text className="mb-2 text-xs font-medium">
                        {t("entity.viewSettings.metrics.bucket", {
                          index: bucketIndex + 1,
                        })}
                      </Text>
                      <MetricBindingsEditor
                        metric={definition}
                        bindings={bucket}
                        entityDefinition={entityDefinition}
                        filterFieldOptions={filterFieldOptions}
                        onChange={(bindings) => {
                          const buckets = widget.buckets.map((entry, index) =>
                            index === bucketIndex ? bindings : entry,
                          );
                          updateWidget(widget.id, { buckets });
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateWidget(widget.id, {
                        buckets: [
                          ...widget.buckets,
                          createEmptyMetricBindings(),
                        ],
                      })
                    }
                  >
                    {t("entity.viewSettings.metrics.addBucket")}
                  </Button>
                </div>
              )
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
