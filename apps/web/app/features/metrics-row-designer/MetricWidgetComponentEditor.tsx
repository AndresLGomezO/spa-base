import type {
  MetricWidgetComponentConfig,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import { FieldLabel, Text, Select } from "@repo/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import type { EntityName } from "../../entities/entity-catalog";
import { getEntityLabel } from "../../entities/entity-catalog";

interface MetricWidgetComponentEditorProps {
  readonly config: MetricWidgetComponentConfig;
  readonly currentEntityName: EntityName;
  readonly onChange: (config: UiComponentConfig) => void;
}

function resolveMetricWidgetLabel(
  entityName: string,
  widgetName: string,
  getDefinition: ReturnType<typeof useEntityCatalog>["getDefinition"],
): string {
  const entityLabel = getEntityLabel(getDefinition(entityName as EntityName));
  return `${entityLabel} · ${widgetName}`;
}

export function MetricWidgetComponentEditor({
  config,
  currentEntityName,
  onChange,
}: MetricWidgetComponentEditorProps) {
  const { t } = useTranslation("common");
  const { items, getDefinition } = useEntityCatalog();

  const selectedEntityName =
    config.entityName.trim().length > 0 ? config.entityName : currentEntityName;
  const entityDefinition = useEntityDefinition(
    selectedEntityName as EntityName,
  );

  const widgets = entityDefinition.ui.metricWidgets ?? [];

  const entityOptions = useMemo(
    () =>
      items.map((item) => ({
        value: item.name,
        label: getEntityLabel(item),
      })),
    [items],
  );

  const handleEntityChange = (entityName: string) => {
    const nextWidgets =
      getDefinition(entityName as EntityName).ui.metricWidgets ?? [];
    const widgetId = nextWidgets.some((widget) => widget.id === config.widgetId)
      ? config.widgetId
      : "";

    onChange({
      ...config,
      entityName,
      widgetId,
      label: widgetId
        ? resolveMetricWidgetLabel(
            entityName,
            nextWidgets.find((widget) => widget.id === widgetId)?.name ?? "",
            getDefinition,
          )
        : undefined,
    });
  };

  const handleWidgetChange = (widgetId: string) => {
    const widget = widgets.find((item) => item.id === widgetId);
    onChange({
      ...config,
      widgetId,
      label: widget
        ? resolveMetricWidgetLabel(
            selectedEntityName,
            widget.name,
            getDefinition,
          )
        : undefined,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <FieldLabel>
          {t("metricsRowDesigner.metricWidgetEditor.entity")}
        </FieldLabel>
        <Select
          value={selectedEntityName}
          onChange={(event) => handleEntityChange(event.target.value)}
        >
          {entityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1">
        <FieldLabel>
          {t("metricsRowDesigner.metricWidgetEditor.widget")}
        </FieldLabel>
        {widgets.length === 0 ? (
          <Text className="text-muted-foreground text-sm">
            {t("metricsRowDesigner.metricWidgetEditor.noWidgetsForEntity")}
          </Text>
        ) : (
          <Select
            value={config.widgetId}
            onChange={(event) => handleWidgetChange(event.target.value)}
          >
            <option value="" disabled>
              {t("metricsRowDesigner.metricWidgetEditor.selectWidget")}
            </option>
            {widgets.map((widget) => (
              <option key={widget.id} value={widget.id}>
                {widget.name}
              </option>
            ))}
          </Select>
        )}
      </label>
    </div>
  );
}
