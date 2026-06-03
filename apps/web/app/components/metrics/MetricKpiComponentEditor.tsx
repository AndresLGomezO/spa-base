import { useQuery } from "@tanstack/react-query";
import type {
  MetricKpiComponentConfig,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import type { SerializableEntityDefinition } from "@repo/entities";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useAnyPermission } from "../../auth/useAnyPermission.js";
import { usePermission } from "../../auth/usePermission.js";
import { listMetricDefinitions } from "../../lib/api-client.js";
import { MetricBindingsEditor } from "./MetricBindingsEditor.js";

const SELECT_CLASS =
  "border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

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
  const canConfigureWidgets = useAnyPermission(
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );
  const canListDefinitions = usePermission("metricDefinition.read");

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

  const metric = useMemo(
    () => definitions.find((item) => item.id === config.metricDefinitionId),
    [config.metricDefinitionId, definitions],
  );

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {t("entity.viewSettings.metrics.definition")}
        </span>
        <select
          className={SELECT_CLASS}
          value={config.metricDefinitionId}
          onChange={(event) =>
            onChange({
              ...config,
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

      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {t("entity.viewSettings.label")}
        </span>
        <input
          className={SELECT_CLASS}
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
          entityDefinition={entityDefinition}
          filterFieldOptions={filterFieldOptions}
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
