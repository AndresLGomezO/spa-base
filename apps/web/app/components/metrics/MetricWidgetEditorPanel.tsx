import { useQuery } from "@tanstack/react-query";
import { Button, Text } from "@repo/ui";
import { migrateMetricWidgetLayout } from "@repo/entities";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type {
  SerializableEntityDefinition,
  ViewMetricWidget,
} from "@repo/entities";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import { useAnyPermission } from "../../auth/useAnyPermission.js";
import { usePermission } from "../../auth/usePermission.js";
import { EntityCardLayoutBuilder } from "../../features/ui-builder/EntityCardLayoutBuilder.js";
import { listMetricDefinitions } from "../../lib/api-client.js";
import { CollapsibleSection } from "../CollapsibleSection.js";
import { createDefaultMetricSeriesBucketLayout } from "@repo/entities";
import { createEmptyMetricBindings } from "./metric-widgets-builder-state.js";
import { metricWidgetPlacementForEditor } from "./metric-strip-grid-styles.js";
import { MetricWidgetPlacementEditor } from "./MetricWidgetPlacementEditor.js";

const SELECT_CLASS =
  "border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

interface MetricWidgetEditorPanelProps {
  readonly widget: ViewMetricWidget;
  readonly widgets?: readonly ViewMetricWidget[];
  readonly widgetIndex?: number;
  readonly columnCount?: number;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly filterFieldOptions: readonly string[];
  readonly onChange: (widget: ViewMetricWidget) => void;
  readonly includePlacementEditor?: boolean;
}

export function MetricWidgetEditorPanel({
  widget,
  entityDefinition,
  onChange,
  widgets = [],
  widgetIndex = 0,
  columnCount = 4,
  includePlacementEditor = true,
}: MetricWidgetEditorPanelProps) {
  const { t } = useTranslation("common");
  const canConfigureWidgets = useAnyPermission(
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );
  const canListDefinitions = usePermission("metricDefinition.read");

  const resolvedWidget = useMemo(
    () => migrateMetricWidgetLayout(widget),
    [widget],
  );

  const definitionsQuery = useQuery({
    queryKey: ["metric-definitions", "active"],
    queryFn: async () => {
      const result = await listMetricDefinitions();
      return result.items.filter((item) => item.status === "ACTIVE");
    },
    enabled: canConfigureWidgets && canListDefinitions,
  });

  const definitions = useMemo(
    () => definitionsQuery.data ?? [],
    [definitionsQuery.data],
  );

  const structureLabels = useMemo(
    () => ({
      structure: t("designLayout.metricWidgetStructure"),
      layoutColumns: t("entity.viewSettings.layoutColumns"),
      showActions: t("entity.viewSettings.showActions"),
      columnStyles: t("entity.viewSettings.columnStyles"),
      stackDirection: {
        title: t("entity.viewSettings.stackDirection"),
        vertical: t("entity.viewSettings.stackVertical"),
        horizontal: t("entity.viewSettings.stackHorizontal"),
      },
      styleRules: {
        addStyleRule: t("entity.viewSettings.addStyleRule"),
        removeStyleRule: t("entity.viewSettings.removeStyleRule"),
        styleProperty: t("entity.viewSettings.styleProperty"),
        styleValue: t("entity.viewSettings.styleValue"),
      },
      columnTab: (column: number) =>
        t("entity.viewSettings.columnTab", { column }),
      columnWidthPercent: t("entity.viewSettings.columnWidthPercent"),
      columnWidthAutoHint: (percent: number) =>
        t("entity.viewSettings.columnWidthAutoHint", { percent }),
      moveColumnLeft: t("entity.viewSettings.moveColumnLeft"),
      moveColumnRight: t("entity.viewSettings.moveColumnRight"),
      deleteColumn: (column: number) =>
        t("entity.viewSettings.deleteColumn", { column }),
      addRow: t("entity.viewSettings.addSlot"),
      componentRow: t("entity.viewSettings.component"),
      nestedRow: t("entity.viewSettings.slotColumns"),
      emptyColumn: t("entity.viewSettings.emptyColumn"),
      moveUp: t("entity.viewSettings.moveSlotUp"),
      moveDown: t("entity.viewSettings.moveSlotDown"),
      deleteRow: t("entity.viewSettings.deleteSlot"),
      componentEditor: {
        component: t("entity.viewSettings.component"),
        staticValue: t("entity.viewSettings.staticValue"),
        field: t("entity.viewSettings.field"),
        fallbacks: t("entity.viewSettings.fallbacks"),
        remove: t("entity.viewSettings.remove"),
        addFallback: t("entity.viewSettings.addFallback"),
        slotSettings: t("entity.viewSettings.slotSettings"),
        componentStyles: t("entity.viewSettings.componentStyles"),
        badgeColorRules: t("entity.viewSettings.badgeColorRules"),
        matchValue: t("entity.viewSettings.matchValue"),
        addRule: t("entity.viewSettings.addRule"),
        imageSize: t("entity.viewSettings.imageSize"),
        dateDisplayFormat: t("entity.viewSettings.dateDisplayFormat"),
        displayFormat: t("entity.viewSettings.displayFormat"),
        showCurrency: t("entity.viewSettings.showCurrency"),
        showToneColors: t("entity.viewSettings.showToneColors"),
        styleRules: {
          addStyleRule: t("entity.viewSettings.addStyleRule"),
          removeStyleRule: t("entity.viewSettings.removeStyleRule"),
          styleProperty: t("entity.viewSettings.styleProperty"),
          styleValue: t("entity.viewSettings.styleValue"),
        },
        label: {
          showLabel: t("entity.viewSettings.showLabel"),
          label: t("entity.viewSettings.label"),
          labelPosition: t("entity.viewSettings.labelPosition"),
          labelAbove: t("entity.viewSettings.labelAbove"),
          labelBelow: t("entity.viewSettings.labelBelow"),
          labelAlignLeft: t("entity.viewSettings.labelAlignLeft"),
          labelAlignCenter: t("entity.viewSettings.labelAlignCenter"),
          labelAlignRight: t("entity.viewSettings.labelAlignRight"),
          labelColor: t("entity.viewSettings.labelColor"),
        },
      },
    }),
    [t],
  );

  if (!canConfigureWidgets) {
    return (
      <Text variant="muted" className="text-sm">
        {t("entity.viewSettings.metrics.forbidden")}
      </Text>
    );
  }

  function update(patch: Partial<ViewMetricWidget>) {
    onChange({ ...resolvedWidget, ...patch } as ViewMetricWidget);
  }

  function updateLayout(layout: UiLayoutDocument) {
    update({ layout });
  }

  const kpiLayout =
    resolvedWidget.display === "kpi" ? resolvedWidget.layout : undefined;
  const seriesLayout =
    resolvedWidget.display === "series" ? resolvedWidget.layout : undefined;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {t("entity.viewSettings.metrics.definition")}
        </span>
        <select
          className={SELECT_CLASS}
          value={resolvedWidget.metricDefinitionId}
          onChange={(event) =>
            update({ metricDefinitionId: event.target.value })
          }
        >
          {definitions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      {includePlacementEditor ? (
        <MetricWidgetPlacementEditor
          widget={resolvedWidget}
          widgets={widgets}
          columnCount={columnCount}
          placement={metricWidgetPlacementForEditor(
            resolvedWidget,
            widgetIndex,
            columnCount,
          )}
          onChange={(placement) => update({ placement })}
        />
      ) : null}

      {resolvedWidget.display === "kpi" && kpiLayout ? (
        <div className="flex flex-col gap-2">
          <Text variant="muted" className="text-xs">
            {t("designLayout.metricKpiSlotHint")}
          </Text>
          <EntityCardLayoutBuilder
            layout={kpiLayout}
            definition={entityDefinition}
            defaultFieldPath="name"
            onLayoutChange={updateLayout}
            labels={structureLabels}
            designSurface="metricWidget"
            showStructureHeading
          />
        </div>
      ) : null}

      {resolvedWidget.display === "series" ? (
        <div className="flex flex-col gap-3">
          {seriesLayout ? (
            <CollapsibleSection
              title={t("designLayout.metricSeriesChrome")}
              defaultOpen
            >
              <EntityCardLayoutBuilder
                layout={seriesLayout}
                definition={entityDefinition}
                defaultFieldPath="name"
                onLayoutChange={updateLayout}
                labels={structureLabels}
                designSurface="metricWidget"
              />
            </CollapsibleSection>
          ) : null}

          {resolvedWidget.buckets.map((bucket, bucketIndex) => {
            const bucketLayout =
              bucket.layout ??
              createDefaultMetricSeriesBucketLayout(
                resolvedWidget.metricDefinitionId,
                bucket,
              );

            return (
              <CollapsibleSection
                key={`${resolvedWidget.id}-bucket-layout-${bucketIndex}`}
                title={t("entity.viewSettings.metrics.bucket", {
                  index: bucketIndex + 1,
                })}
                defaultOpen={bucketIndex === 0}
              >
                <EntityCardLayoutBuilder
                  layout={bucketLayout}
                  definition={entityDefinition}
                  defaultFieldPath="name"
                  onLayoutChange={(layout) => {
                    const buckets = resolvedWidget.buckets.map(
                      (entry, index) =>
                        index === bucketIndex ? { ...entry, layout } : entry,
                    );
                    update({ buckets });
                  }}
                  labels={{
                    ...structureLabels,
                    structure: t("designLayout.metricBucketStructure"),
                  }}
                  designSurface="metricWidgetBucket"
                />
              </CollapsibleSection>
            );
          })}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const bucket = {
                ...createEmptyMetricBindings(),
                layout: createDefaultMetricSeriesBucketLayout(
                  resolvedWidget.metricDefinitionId,
                ),
              };
              update({ buckets: [...resolvedWidget.buckets, bucket] });
            }}
          >
            {t("entity.viewSettings.metrics.addBucket")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
