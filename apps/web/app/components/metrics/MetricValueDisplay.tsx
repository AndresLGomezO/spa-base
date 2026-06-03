import type { ReactNode } from "react";
import { LayoutCard, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { MetricBindingSource } from "@repo/entities";

import {
  buildMetricRowQueryFromBindings,
  type MetricBindingContext,
} from "../../lib/metric-binding-resolution.js";
import type { MetricRowQuery } from "../../lib/api-client.js";
import { useCanReadMetricValues } from "../../hooks/metrics/useCanReadMetricValues.js";
import { useMetricDefinition } from "../../hooks/metrics/useMetricDefinition.js";
import { useMetricRow } from "../../hooks/metrics/useMetricRow.js";
import { formatPrimaryMetricDisplayValue } from "./format-metric-display-value.js";

type MetricValuePresentation = "card" | "inline";

interface MetricValueDisplayProps {
  readonly metricDefinitionId: string;
  readonly groupBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly dimensionBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly context?: MetricBindingContext;
  readonly label?: string;
  readonly emptyLabel?: string;
  readonly query?: MetricRowQuery | null;
  readonly presentation?: MetricValuePresentation;
}

function MetricValueShell({
  presentation,
  children,
}: {
  readonly presentation: MetricValuePresentation;
  readonly children: ReactNode;
}) {
  if (presentation === "inline") {
    return <>{children}</>;
  }
  return <LayoutCard>{children}</LayoutCard>;
}

export function MetricValueDisplay({
  metricDefinitionId,
  groupBindings,
  dimensionBindings,
  context = {},
  label,
  emptyLabel,
  query: queryOverride,
  presentation = "card",
}: MetricValueDisplayProps) {
  const { t, i18n } = useTranslation("common");
  const definitionQuery = useMetricDefinition(metricDefinitionId);
  const canRead = useCanReadMetricValues(definitionQuery.data?.sourceModel);
  const inline = presentation === "inline";
  const statusClassName = "text-sm";

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
    sourceModel: definitionQuery.data?.sourceModel,
    query: resolvedQuery,
    enabled: canRead && definitionQuery.isSuccess,
  });

  if (!canRead) {
    return (
      <MetricValueShell presentation={presentation}>
        <Text variant="muted" className={statusClassName}>
          {t("metrics.widget.forbidden")}
        </Text>
      </MetricValueShell>
    );
  }

  if (definitionQuery.isLoading || rowQuery.isLoading) {
    return (
      <MetricValueShell presentation={presentation}>
        <Text variant="muted" className={statusClassName}>
          {t("metrics.widget.loading")}
        </Text>
      </MetricValueShell>
    );
  }

  if (definitionQuery.isError) {
    return (
      <MetricValueShell presentation={presentation}>
        <Text variant="muted" className={statusClassName}>
          {t("metrics.widget.error")}
        </Text>
      </MetricValueShell>
    );
  }

  const definition = definitionQuery.data;
  if (!definition) {
    return null;
  }

  const title = label ?? definition.name;
  const row = rowQuery.data;
  const emptyText = emptyLabel ?? t("metrics.widget.empty");

  if (!row) {
    if (inline) {
      return (
        <Text className="text-2xl font-semibold tabular-nums">{emptyText}</Text>
      );
    }
    return (
      <MetricValueShell presentation={presentation}>
        <Text className="text-muted-foreground text-xs">{title}</Text>
        <Text className="text-lg font-semibold tabular-nums">{emptyText}</Text>
      </MetricValueShell>
    );
  }

  const value = formatPrimaryMetricDisplayValue(
    definition,
    row.values,
    i18n.language,
  );
  const displayValue = value === null ? emptyText : value;

  if (inline) {
    return (
      <Text className="text-2xl font-semibold tabular-nums">
        {displayValue}
      </Text>
    );
  }

  return (
    <MetricValueShell presentation={presentation}>
      <Text className="text-muted-foreground text-xs">{title}</Text>
      <Text className="text-2xl font-semibold tabular-nums">
        {displayValue}
      </Text>
    </MetricValueShell>
  );
}
