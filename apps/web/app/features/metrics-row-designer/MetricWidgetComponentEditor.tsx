import type {
  MetricWidgetComponentConfig,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import { FieldLabel, Text } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import type {
  EntityName,
  EntityCatalogEntry,
} from "../../entities/entity-catalog";
import {
  getEntityLabel,
  tryGetEntityDefinition,
} from "../../entities/entity-catalog";
import {
  findMetricWidgetEntityName,
  normalizeMetricWidgetString,
} from "../ui-builder/resolve-metric-widget-reference";

function normalizeOptionalString(value: string | undefined): string {
  return normalizeMetricWidgetString(value);
}

interface MetricWidgetComponentEditorProps {
  readonly config: MetricWidgetComponentConfig;
  readonly currentEntityName?: EntityName;
  readonly onChange: (config: UiComponentConfig) => void;
}

function entityHasMetricWidgets(
  catalog: readonly EntityCatalogEntry[],
  entityName: string,
): boolean {
  const definition = tryGetEntityDefinition(entityName, catalog);
  return (definition?.ui.metricWidgets?.length ?? 0) > 0;
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

  const configuredEntityName = normalizeOptionalString(config.entityName);

  const entitiesWithWidgets = useMemo(
    () => items.filter((item) => entityHasMetricWidgets(items, item.name)),
    [items],
  );

  const entityOptions = useMemo(() => {
    const options = entitiesWithWidgets.map((item) => ({
      value: item.name,
      label: getEntityLabel(item),
    }));

    if (
      configuredEntityName.length > 0 &&
      !options.some((option) => option.value === configuredEntityName)
    ) {
      const staleDefinition = tryGetEntityDefinition(
        configuredEntityName,
        items,
      );
      options.unshift({
        value: configuredEntityName,
        label: staleDefinition
          ? getEntityLabel(staleDefinition)
          : configuredEntityName,
      });
    }

    return options;
  }, [configuredEntityName, entitiesWithWidgets, items]);

  const selectedEntityName =
    configuredEntityName.length > 0
      ? configuredEntityName
      : currentEntityName && entityHasMetricWidgets(items, currentEntityName)
        ? currentEntityName
        : (entitiesWithWidgets[0]?.name ?? "");

  const widgets = useMemo(() => {
    if (selectedEntityName.trim().length === 0) {
      return [];
    }

    const definition = tryGetEntityDefinition(selectedEntityName, items);
    return definition?.ui.metricWidgets ?? [];
  }, [items, selectedEntityName]);

  useEffect(() => {
    const widgetId = normalizeOptionalString(config.widgetId);
    if (configuredEntityName.length > 0 || widgetId.length === 0) {
      return;
    }

    const entityName = findMetricWidgetEntityName(items, widgetId);
    if (!entityName) {
      return;
    }

    const widget = tryGetEntityDefinition(
      entityName,
      items,
    )?.ui.metricWidgets?.find((item) => item.id === widgetId);
    if (!widget) {
      return;
    }

    onChange({
      ...config,
      entityName,
      label: resolveMetricWidgetLabel(entityName, widget.name, getDefinition),
    });
  }, [config, configuredEntityName.length, getDefinition, items, onChange]);

  const handleEntityChange = (entityName: string) => {
    const nextWidgets =
      tryGetEntityDefinition(entityName, items)?.ui.metricWidgets ?? [];
    const widgetId = nextWidgets.some((widget) => widget.id === config.widgetId)
      ? (config.widgetId ?? "")
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
      entityName: selectedEntityName,
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
        {entityOptions.length === 0 ? (
          <Text className="text-muted-foreground text-sm">
            {t("metricsRowDesigner.metricWidgetEditor.noEntitiesWithWidgets")}
          </Text>
        ) : (
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
        )}
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
            value={config.widgetId ?? ""}
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
