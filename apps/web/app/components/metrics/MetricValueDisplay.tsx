import type { CSSProperties, ReactNode } from "react";
import { cn } from "@repo/theme/utils";
import { LayoutCard, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { MetricBindingSource } from "@repo/entities";

import {
  buildMetricRowQueryFromBindings,
  type MetricBindingContext,
} from "../../lib/metric-binding-resolution.js";
import type { MetricRowQuery } from "../../lib/api-client.js";
import { useMetricReadAccess } from "../../hooks/metrics/useCanReadMetricValues.js";
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
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly valueClassName?: string;
  readonly textSize?: number;
}

function MetricValueShell({
  presentation,
  children,
  className,
  style,
}: {
  readonly presentation: MetricValuePresentation;
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
}) {
  if (presentation === "inline") {
    if (!className && !style) {
      return <>{children}</>;
    }
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <LayoutCard className={className} style={style}>
      {children}
    </LayoutCard>
  );
}

function metricValueTextClassName(valueClassName: string | undefined): string {
  return cn("tabular-nums", valueClassName || "text-2xl font-semibold");
}

function metricValueTextStyle(
  textSize: number | undefined,
): CSSProperties | undefined {
  return textSize !== undefined ? { fontSize: textSize } : undefined;
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
  className,
  style,
  valueClassName,
  textSize,
}: MetricValueDisplayProps) {
  const { t, i18n } = useTranslation("common");
  const definitionQuery = useMetricDefinition(metricDefinitionId);
  const readAccess = useMetricReadAccess(definitionQuery.data?.sourceModel, {
    sourceModelResolved: definitionQuery.isFetched,
  });
  const canRead = readAccess === "allowed";
  const inline = presentation === "inline";
  const statusClassName = "text-sm";
  const valueTextClassName = metricValueTextClassName(valueClassName);
  const valueTextStyle = metricValueTextStyle(textSize);

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

  if (
    readAccess === "pending" ||
    definitionQuery.isLoading ||
    (canRead && rowQuery.isLoading)
  ) {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
      >
        <Text variant="muted" className={statusClassName}>
          {t("metrics.widget.loading")}
        </Text>
      </MetricValueShell>
    );
  }

  if (readAccess === "denied") {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
      >
        <Text variant="muted" className={statusClassName}>
          {t("metrics.widget.forbidden")}
        </Text>
      </MetricValueShell>
    );
  }

  if (definitionQuery.isError) {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
      >
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
        <MetricValueShell
          presentation={presentation}
          className={className}
          style={style}
        >
          <Text className={valueTextClassName} style={valueTextStyle}>
            {emptyText}
          </Text>
        </MetricValueShell>
      );
    }
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
      >
        <Text className="text-muted-foreground text-xs">{title}</Text>
        <Text className={valueTextClassName} style={valueTextStyle}>
          {emptyText}
        </Text>
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
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
      >
        <Text className={valueTextClassName} style={valueTextStyle}>
          {displayValue}
        </Text>
      </MetricValueShell>
    );
  }

  return (
    <MetricValueShell
      presentation={presentation}
      className={className}
      style={style}
    >
      <Text className="text-muted-foreground text-xs">{title}</Text>
      <Text className={valueTextClassName} style={valueTextStyle}>
        {displayValue}
      </Text>
    </MetricValueShell>
  );
}
