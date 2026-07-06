import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SerializableEntityDefinition } from "@repo/entities";
import type {
  ChartComponentConfig,
  MetricBindingSource,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import { FieldLabel, Select, Text } from "@repo/ui";

import { MetricBindingsEditor } from "../metrics/MetricBindingsEditor.js";
import { MetricBindingSourceEditor } from "../metrics/MetricBindingSourceEditor.js";
import { useChartDefinitions } from "../../hooks/useChartDefinitions.js";
import { useEntityQueryDefinitions } from "../../hooks/useEntityQueryDefinitions.js";
import { resolveChartDefinitionRecord } from "../../lib/resolve-chart-definition-reference.js";
import { resolveEntityQueryDefinitionDocumentId } from "../../lib/resolve-entity-query-definition-reference.js";
import { useEntityCatalog } from "../../entities/entity-catalog-context.js";
import { useActiveMetricDefinitions } from "../../hooks/metrics/useActiveMetricDefinitions.js";
import { resolveMetricDefinitionDocumentId } from "../../lib/resolve-metric-definition-reference.js";

interface ChartComponentEditorProps {
  readonly config: ChartComponentConfig;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly filterFieldOptions: readonly string[];
  readonly onChange: (config: UiComponentConfig) => void;
}

function updateParameterBinding(
  config: ChartComponentConfig,
  name: string,
  source: MetricBindingSource,
): ChartComponentConfig {
  return {
    ...config,
    parameterBindings: {
      ...(config.parameterBindings ?? {}),
      [name]: source,
    },
  };
}

export function ChartComponentEditor({
  config,
  entityDefinition,
  filterFieldOptions,
  onChange,
}: ChartComponentEditorProps) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const chartDefinitionsQuery = useChartDefinitions(true);
  const entityQueryDefinitionsQuery = useEntityQueryDefinitions(true);
  const metricDefinitionsQuery = useActiveMetricDefinitions(true);
  const chartDefinitions = useMemo(
    () => chartDefinitionsQuery.data ?? [],
    [chartDefinitionsQuery.data],
  );
  const entityQueryDefinitions = useMemo(
    () => entityQueryDefinitionsQuery.data ?? [],
    [entityQueryDefinitionsQuery.data],
  );
  const metricDefinitions = useMemo(
    () => metricDefinitionsQuery.data ?? [],
    [metricDefinitionsQuery.data],
  );

  const selectedDefinition = useMemo(
    () =>
      resolveChartDefinitionRecord(config.chartDefinitionId, chartDefinitions),
    [chartDefinitions, config.chartDefinitionId],
  );

  const resolvedChartId = selectedDefinition?.id ?? config.chartDefinitionId;

  const entityQueryDefinition = useMemo(() => {
    if (selectedDefinition?.dataSource.type !== "entityQuery") {
      return undefined;
    }
    const resolvedId = resolveEntityQueryDefinitionDocumentId(
      selectedDefinition.dataSource.entityQueryDefinitionId,
      entityQueryDefinitions,
    );
    return entityQueryDefinitions.find((entry) => entry.id === resolvedId);
  }, [entityQueryDefinitions, selectedDefinition]);

  const entityQuerySourceEntity = useMemo(() => {
    if (!entityQueryDefinition) {
      return entityDefinition;
    }
    return (
      entities.find(
        (entity) => entity.name === entityQueryDefinition.sourceEntity,
      ) ?? entityDefinition
    );
  }, [entities, entityDefinition, entityQueryDefinition]);

  const entityQueryFilterFieldOptions = useMemo(() => {
    if (entityQuerySourceEntity === entityDefinition) {
      return filterFieldOptions;
    }
    return Object.keys(entityQuerySourceEntity.fields).filter(
      (field) => entityQuerySourceEntity.fields[field]?.type !== "document",
    );
  }, [entityQuerySourceEntity, entityDefinition, filterFieldOptions]);

  const metricDefinition = useMemo(() => {
    if (selectedDefinition?.dataSource.type !== "metricSeries") {
      return undefined;
    }
    const resolvedId = resolveMetricDefinitionDocumentId(
      selectedDefinition.dataSource.metricDefinitionId,
      metricDefinitions,
    );
    return metricDefinitions.find((entry) => entry.id === resolvedId);
  }, [metricDefinitions, selectedDefinition]);

  const bindingEntityDefinition = useMemo(() => {
    if (!metricDefinition) {
      return entityDefinition;
    }
    return (
      entities.find((entity) => entity.name === metricDefinition.sourceModel) ??
      entityDefinition
    );
  }, [entities, entityDefinition, metricDefinition]);

  const bindingFilterFieldOptions = useMemo(() => {
    if (bindingEntityDefinition === entityDefinition) {
      return filterFieldOptions;
    }
    return Object.keys(bindingEntityDefinition.fields).filter(
      (field) => bindingEntityDefinition.fields[field]?.type !== "document",
    );
  }, [bindingEntityDefinition, entityDefinition, filterFieldOptions]);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <FieldLabel>{t("chartComponent.definition")}</FieldLabel>
        {chartDefinitions.length === 0 ? (
          <Text className="text-muted-foreground text-sm">
            {t("chartComponent.noDefinitions")}
          </Text>
        ) : (
          <Select
            value={resolvedChartId}
            onChange={(event) =>
              onChange({
                ...config,
                chartDefinitionId: event.target.value,
              })
            }
          >
            <option value="">{t("chartComponent.selectDefinition")}</option>
            {chartDefinitions.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.name}
              </option>
            ))}
          </Select>
        )}
      </label>

      {entityQueryDefinition &&
      (entityQueryDefinition.parameters?.length ?? 0) > 0 ? (
        <div className="flex flex-col gap-2">
          <Text className="text-sm font-medium">
            {t("chartComponent.parameterBindings")}
          </Text>
          {entityQueryDefinition.parameters?.map((parameter) => (
            <MetricBindingSourceEditor
              key={parameter.name}
              fieldName={parameter.name}
              source={config.parameterBindings?.[parameter.name]}
              definition={entityQuerySourceEntity}
              filterFieldOptions={entityQueryFilterFieldOptions}
              dateGranularity={
                parameter.valueType === "dateBucket"
                  ? parameter.granularity
                  : undefined
              }
              onChange={(source) =>
                onChange(updateParameterBinding(config, parameter.name, source))
              }
            />
          ))}
        </div>
      ) : null}

      {selectedDefinition?.dataSource.type === "metricSeries" &&
      metricDefinition ? (
        <MetricBindingsEditor
          metric={metricDefinition}
          bindings={{
            groupBindings: config.parameterBindings ?? {},
            dimensionBindings: {},
          }}
          entityDefinition={bindingEntityDefinition}
          filterFieldOptions={bindingFilterFieldOptions}
          onChange={(bindings) =>
            onChange({
              ...config,
              parameterBindings: {
                ...(config.parameterBindings ?? {}),
                ...bindings.groupBindings,
                ...bindings.dimensionBindings,
              },
            })
          }
        />
      ) : null}

      <label className="flex flex-col gap-1">
        <FieldLabel>{t("chartComponent.ariaLabel")}</FieldLabel>
        <input
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          value={config.ariaLabel ?? ""}
          onChange={(event) =>
            onChange({
              ...config,
              ariaLabel: event.target.value,
            })
          }
        />
      </label>
    </div>
  );
}
