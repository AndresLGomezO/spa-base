import { useMemo, type CSSProperties, type ReactNode } from "react";
import { cn } from "@repo/theme/utils";
import { LayoutCard, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { MetricBindingSource } from "@repo/entities";

import {
  buildMetricRowQueryFromBindings,
  type MetricBindingContext,
} from "../../lib/metric-binding-resolution.js";
import { buildMetricParameterValuesFromBindings } from "../../lib/build-metric-parameter-values.js";
import type { MetricRowQuery } from "../../lib/api-client.js";
import { resolveMetricDefinitionDocumentId } from "../../lib/resolve-metric-definition-reference.js";
import { useActiveMetricDefinitions } from "../../hooks/metrics/useActiveMetricDefinitions.js";
import { useMetricReadAccess } from "../../hooks/metrics/useCanReadMetricValues.js";
import { useMetricRow } from "../../hooks/metrics/useMetricRow.js";
import { useMetricEvaluate } from "../../hooks/metrics/useMetricEvaluate.js";
import {
  formatPrimaryMetricDisplayValue,
  formatDefaultMetricDisplayValue,
  readPrimaryMetricNumericValue,
} from "./format-metric-display-value.js";
import { resolveMetricKpiValueToneClass } from "@repo/ui-builder-core";

type MetricValuePresentation = "card" | "inline";

interface MetricValueDisplayProps {
  readonly metricDefinitionId: string;
  readonly groupBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly dimensionBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly parameterBindings?: Readonly<Record<string, MetricBindingSource>>;
  readonly queryParameterBindings?: Readonly<
    Record<string, MetricBindingSource>
  >;
  readonly context?: MetricBindingContext;
  readonly label?: string;
  readonly emptyLabel?: string;
  readonly query?: MetricRowQuery | null;
  readonly presentation?: MetricValuePresentation;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly valueClassName?: string;
  readonly valueStyle?: CSSProperties;
  readonly textSize?: number;
  readonly showToneColors?: boolean;
  readonly tonePolarity?: "normal" | "inverted";
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

function metricValueTextClassName(
  valueClassName: string | undefined,
  toneClassName: string,
): string {
  return cn(
    "tabular-nums",
    valueClassName === undefined || valueClassName.length === 0
      ? "text-2xl font-semibold truncate"
      : valueClassName,
    toneClassName,
  );
}

function metricValueTextStyle(
  textSize: number | undefined,
): CSSProperties | undefined {
  return textSize !== undefined ? { fontSize: textSize } : undefined;
}

function MetricKpiValueText({
  children,
  valueClassName,
  textSize,
  valueStyle,
}: {
  readonly children: ReactNode;
  readonly valueClassName: string;
  readonly textSize: number | undefined;
  readonly valueStyle?: CSSProperties;
}) {
  return (
    <span
      className={valueClassName}
      style={{ ...valueStyle, ...metricValueTextStyle(textSize) }}
    >
      {children}
    </span>
  );
}

export function MetricValueDisplay({
  metricDefinitionId,
  groupBindings,
  dimensionBindings,
  parameterBindings,
  queryParameterBindings,
  context = {},
  label,
  emptyLabel,
  query: queryOverride,
  presentation = "card",
  className,
  style,
  valueClassName,
  valueStyle,
  textSize,
  showToneColors,
  tonePolarity,
}: MetricValueDisplayProps) {
  const { t, i18n } = useTranslation("common");
  const configuredMetricDefinitionId = metricDefinitionId?.trim() ?? "";
  const activeDefinitionsQuery = useActiveMetricDefinitions(
    configuredMetricDefinitionId.length > 0,
  );
  const catalogReady = activeDefinitionsQuery.isSuccess;

  const resolvedMetricDefinitionId = useMemo(() => {
    if (configuredMetricDefinitionId.length === 0 || !catalogReady) {
      return undefined;
    }

    return resolveMetricDefinitionDocumentId(
      configuredMetricDefinitionId,
      activeDefinitionsQuery.data ?? [],
    );
  }, [activeDefinitionsQuery.data, catalogReady, configuredMetricDefinitionId]);

  const definition = useMemo(() => {
    if (!resolvedMetricDefinitionId) {
      return undefined;
    }

    return activeDefinitionsQuery.data?.find(
      (item) => item.id === resolvedMetricDefinitionId,
    );
  }, [activeDefinitionsQuery.data, resolvedMetricDefinitionId]);

  const hasMetricDefinitionId = Boolean(resolvedMetricDefinitionId?.trim());
  const readAccess = useMetricReadAccess(definition?.sourceModel, {
    sourceModelResolved:
      !hasMetricDefinitionId || activeDefinitionsQuery.isFetched,
  });
  const canRead = readAccess === "allowed";
  const inline = presentation === "inline";
  const statusClassName = "text-sm";

  const resolveValueClassName = (numericValue: number | null | undefined) =>
    metricValueTextClassName(
      valueClassName,
      resolveMetricKpiValueToneClass(numericValue, {
        showToneColors,
        tonePolarity,
      }),
    );

  const isComputed = definition?.computationMode === "computed";

  const resolvedParameters = useMemo(() => {
    if (!definition || !isComputed) {
      return null;
    }
    const resolvedParameterBindings =
      parameterBindings ?? queryParameterBindings ?? {};
    return buildMetricParameterValuesFromBindings(
      definition,
      resolvedParameterBindings,
      context,
    );
  }, [
    context,
    definition,
    isComputed,
    parameterBindings,
    queryParameterBindings,
  ]);

  const resolvedQuery = useMemo(
    () =>
      queryOverride ??
      (!isComputed && definition
        ? buildMetricRowQueryFromBindings(
            definition,
            { groupBindings, dimensionBindings },
            context,
          )
        : null),
    [
      context,
      definition,
      dimensionBindings,
      groupBindings,
      isComputed,
      queryOverride,
    ],
  );

  const rowQueryEnabled =
    canRead && Boolean(definition) && !isComputed && resolvedQuery !== null;

  const evaluateEnabled =
    canRead && Boolean(definition) && isComputed && resolvedParameters !== null;

  const rowQuery = useMetricRow({
    metricDefinitionId: resolvedMetricDefinitionId,
    sourceModel: definition?.sourceModel,
    query: resolvedQuery,
    enabled: rowQueryEnabled,
  });

  const evaluateQuery = useMetricEvaluate({
    metricDefinitionId: resolvedMetricDefinitionId,
    definition,
    parameters: resolvedParameters,
    enabled: evaluateEnabled,
  });

  const activeQuery = isComputed ? evaluateQuery : rowQuery;
  const rowQueryEnabledForLoading = isComputed
    ? evaluateEnabled
    : rowQueryEnabled;

  if (configuredMetricDefinitionId.length === 0) {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
      >
        <Text variant="muted" className={statusClassName}>
          {t("metrics.widget.unconfigured")}
        </Text>
      </MetricValueShell>
    );
  }

  if (
    readAccess === "pending" ||
    activeDefinitionsQuery.isLoading ||
    (configuredMetricDefinitionId.length > 0 && !catalogReady) ||
    (rowQueryEnabledForLoading && activeQuery.isLoading)
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

  if (activeDefinitionsQuery.isError || activeQuery.isError) {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
      >
        <Text variant="muted" className={statusClassName}>
          {activeDefinitionsQuery.isError
            ? t("metrics.widget.unknown")
            : t("metrics.widget.error")}
        </Text>
      </MetricValueShell>
    );
  }

  if (catalogReady && configuredMetricDefinitionId.length > 0 && !definition) {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
      >
        <Text variant="muted" className={statusClassName}>
          {t("metrics.widget.unknown")}
        </Text>
      </MetricValueShell>
    );
  }

  if (!definition) {
    return null;
  }

  const title = label ?? definition.name;
  const row = activeQuery.data;
  const defaultDisplayValue = formatDefaultMetricDisplayValue(
    definition,
    i18n.language,
  );
  const emptyText =
    emptyLabel ??
    (isComputed ? t("metrics.widget.noValue") : defaultDisplayValue);

  if (!row) {
    if (inline) {
      return (
        <MetricValueShell
          presentation={presentation}
          className={className}
          style={style}
        >
          <MetricKpiValueText
            valueClassName={resolveValueClassName(null)}
            valueStyle={valueStyle}
            textSize={textSize}
          >
            {emptyText}
          </MetricKpiValueText>
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
        <MetricKpiValueText
          valueClassName={resolveValueClassName(null)}
          valueStyle={valueStyle}
          textSize={textSize}
        >
          {emptyText}
        </MetricKpiValueText>
      </MetricValueShell>
    );
  }

  const numericValue = readPrimaryMetricNumericValue(definition, row.values);
  const value = formatPrimaryMetricDisplayValue(
    definition,
    row.values,
    i18n.language,
  );
  const displayValue = value === null ? emptyText : value;
  const valueTextClassName = resolveValueClassName(numericValue);

  if (inline) {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
      >
        <MetricKpiValueText
          valueClassName={valueTextClassName}
          valueStyle={valueStyle}
          textSize={textSize}
        >
          {displayValue}
        </MetricKpiValueText>
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
      <MetricKpiValueText
        valueClassName={valueTextClassName}
        valueStyle={valueStyle}
        textSize={textSize}
      >
        {displayValue}
      </MetricKpiValueText>
    </MetricValueShell>
  );
}
