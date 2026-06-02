import { LayoutCard, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { MetricBindingSource } from "@repo/entities";

import { usePermission } from "../../auth/usePermission.js";
import {
  buildMetricRowQueryFromBindings,
  type MetricBindingContext,
} from "../../lib/metric-binding-resolution.js";
import type { MetricRowQuery } from "../../lib/api-client.js";
import { useMetricDefinition } from "../../hooks/metrics/useMetricDefinition.js";
import { useMetricRow } from "../../hooks/metrics/useMetricRow.js";
import { formatPrimaryMetricValue } from "./format-metric-display-value.js";

interface MetricValueDisplayProps {
  readonly metricDefinitionId: string;
  readonly groupBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly dimensionBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly context?: MetricBindingContext;
  readonly label?: string;
  readonly emptyLabel?: string;
  readonly query?: MetricRowQuery | null;
}

export function MetricValueDisplay({
  metricDefinitionId,
  groupBindings,
  dimensionBindings,
  context = {},
  label,
  emptyLabel,
  query: queryOverride,
}: MetricValueDisplayProps) {
  const { t } = useTranslation("common");
  const canRead = usePermission("metricValue.read");
  const definitionQuery = useMetricDefinition(metricDefinitionId);

  const resolvedQuery =
    queryOverride ??
    (definitionQuery.data
      ? buildMetricRowQueryFromBindings(
          definitionQuery.data,
          { groupBindings, dimensionBindings },
          context,
        )
      : null);

  const rowQuery = useMetricRow({
    metricDefinitionId,
    query: resolvedQuery,
    enabled: canRead && definitionQuery.isSuccess,
  });

  if (!canRead) {
    return (
      <LayoutCard>
        <Text variant="muted" className="text-sm">
          {t("metrics.widget.forbidden")}
        </Text>
      </LayoutCard>
    );
  }

  if (definitionQuery.isLoading || rowQuery.isLoading) {
    return (
      <LayoutCard>
        <Text variant="muted" className="text-sm">
          {t("metrics.widget.loading")}
        </Text>
      </LayoutCard>
    );
  }

  if (definitionQuery.isError) {
    return (
      <LayoutCard>
        <Text variant="muted" className="text-sm">
          {t("metrics.widget.error")}
        </Text>
      </LayoutCard>
    );
  }

  const definition = definitionQuery.data;
  if (!definition) {
    return null;
  }

  const title = label ?? definition.name;
  const row = rowQuery.data;

  if (!row) {
    return (
      <LayoutCard>
        <Text className="text-muted-foreground text-xs">{title}</Text>
        <Text className="text-lg font-semibold tabular-nums">
          {emptyLabel ?? t("metrics.widget.empty")}
        </Text>
      </LayoutCard>
    );
  }

  const value = formatPrimaryMetricValue(definition, row.values);

  return (
    <LayoutCard>
      <Text className="text-muted-foreground text-xs">{title}</Text>
      <Text className="text-2xl font-semibold tabular-nums">
        {value === null ? (emptyLabel ?? t("metrics.widget.empty")) : value}
      </Text>
    </LayoutCard>
  );
}
