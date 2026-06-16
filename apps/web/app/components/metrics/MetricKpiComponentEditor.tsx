import type {
  MetricKpiComponentConfig,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import type { SerializableEntityDefinition } from "@repo/entities";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Select, Text } from "@repo/ui";

import { useAnyPermission } from "../../auth/useAnyPermission.js";
import { useEntityCatalog } from "../../entities/entity-catalog-context.js";
import {
  formatMetricDefinitionOptionLabel,
  resolveMetricDefinitionDocumentId,
} from "../../lib/resolve-metric-definition-reference.js";
import { useActiveMetricDefinitions } from "../../hooks/metrics/useActiveMetricDefinitions.js";
import { MetricBindingsEditor } from "./MetricBindingsEditor.js";

interface MetricKpiComponentEditorProps {
  readonly config: MetricKpiComponentConfig;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly filterFieldOptions: readonly string[];
  readonly onChange: (config: UiComponentConfig) => void;
}

export function MetricKpiComponentEditor({
  config,
  entityDefinition,
  filterFieldOptions,
  onChange,
}: MetricKpiComponentEditorProps) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const canConfigureWidgets = useAnyPermission(
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );

  const definitionsQuery = useActiveMetricDefinitions(canConfigureWidgets);

  const definitions = useMemo(
    () => definitionsQuery.data ?? [],
    [definitionsQuery.data],
  );

  const resolvedMetricDefinitionId = useMemo(
    () =>
      resolveMetricDefinitionDocumentId(config.metricDefinitionId, definitions),
    [config.metricDefinitionId, definitions],
  );

  const metric = useMemo(
    () =>
      definitions.find((item) => item.id === resolvedMetricDefinitionId) ??
      definitionsQuery.data?.find(
        (item) => item.id === config.metricDefinitionId.trim(),
      ),
    [
      config.metricDefinitionId,
      definitions,
      definitionsQuery.data,
      resolvedMetricDefinitionId,
    ],
  );

  const bindingEntityDefinition = useMemo(() => {
    if (!metric) {
      return entityDefinition;
    }

    return (
      entities.find((entity) => entity.name === metric.sourceModel) ??
      entityDefinition
    );
  }, [entities, entityDefinition, metric]);

  const bindingFilterFieldOptions = useMemo(
    () =>
      bindingEntityDefinition === entityDefinition
        ? filterFieldOptions
        : Object.keys(bindingEntityDefinition.fields).filter(
            (field) =>
              bindingEntityDefinition.fields[field]?.type !== "document",
          ),
    [bindingEntityDefinition, entityDefinition, filterFieldOptions],
  );

  const metricOptions = useMemo(() => {
    const sorted = [...definitions].sort((left, right) =>
      left.name.localeCompare(right.name),
    );

    if (
      metric &&
      !sorted.some((item) => item.id === metric.id) &&
      config.metricDefinitionId.trim().length > 0
    ) {
      sorted.unshift(metric);
    }

    return sorted;
  }, [config.metricDefinitionId, definitions, metric]);

  const selectedMetricId = resolvedMetricDefinitionId ?? "";

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {t("entity.viewSettings.metrics.definition")}
        </span>
        <Select
          value={selectedMetricId}
          onChange={(event) =>
            onChange({
              ...config,
              metricDefinitionId: event.target.value,
            })
          }
        >
          <option value="">
            {t("entity.viewSettings.metrics.selectMetric")}
          </option>
          {metricOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {formatMetricDefinitionOptionLabel(item)}
            </option>
          ))}
        </Select>
      </label>

      {config.metricDefinitionId.trim().length > 0 && !metric ? (
        <Text className="text-destructive text-xs">
          {t("entity.viewSettings.metrics.definitionMissing")}
        </Text>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {t("entity.viewSettings.label")}
        </span>
        <input
          value={config.label ?? ""}
          onChange={(event) =>
            onChange({
              ...config,
              label: event.target.value.trim() || undefined,
            })
          }
        />
      </label>

      {metric ? (
        <MetricBindingsEditor
          metric={metric}
          bindings={{
            groupBindings: config.groupBindings,
            dimensionBindings: config.dimensionBindings,
          }}
          entityDefinition={bindingEntityDefinition}
          filterFieldOptions={bindingFilterFieldOptions}
          onChange={(bindings) =>
            onChange({
              ...config,
              groupBindings: bindings.groupBindings,
              dimensionBindings: bindings.dimensionBindings,
            })
          }
        />
      ) : null}
    </div>
  );
}
