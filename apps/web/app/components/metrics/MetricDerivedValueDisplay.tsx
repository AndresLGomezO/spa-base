import { useMemo, type CSSProperties, type ReactNode } from "react";
import { cn } from "@repo/theme/utils";
import { formatDisplayValue } from "@repo/ui";
import { LayoutCard, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { MetricDerivedKpiComponentConfig } from "@repo/ui-builder-core";
import { ResponsiveStyleTag } from "@repo/ui-builder-renderer";

import type { MetricBindingContext } from "../../lib/metric-binding-resolution.js";
import { useMetricDerivedValue } from "../../hooks/metrics/useMetricDerivedValue.js";
import { formatMetricDerivedExpressionPreview } from "./metric-derived-expression-preview.js";
import { formatDefaultMetricDisplayValue } from "./format-metric-display-value.js";

type MetricValuePresentation = "card" | "inline";

interface MetricDerivedValueDisplayProps {
  readonly config: Pick<
    MetricDerivedKpiComponentConfig,
    "expression" | "terms" | "groupBindings" | "dimensionBindings" | "label"
  >;
  readonly context?: MetricBindingContext;
  readonly presentation?: MetricValuePresentation;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly valueClassName?: string;
  readonly valueStyle?: CSSProperties;
  readonly textSize?: number;
  readonly cssText?: string;
}

function MetricValueShell({
  presentation,
  children,
  className,
  style,
  cssText,
}: {
  readonly presentation: MetricValuePresentation;
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly cssText?: string;
}) {
  const withResponsiveCss = (node: ReactNode): ReactNode => (
    <>
      <ResponsiveStyleTag cssText={cssText} />
      {node}
    </>
  );

  if (presentation === "inline") {
    if (!className && !style) {
      return withResponsiveCss(children);
    }
    return withResponsiveCss(
      <div className={className} style={style}>
        {children}
      </div>,
    );
  }
  return withResponsiveCss(
    <LayoutCard className={className} style={style}>
      {children}
    </LayoutCard>,
  );
}

function metricValueTextClassName(valueClassName: string | undefined): string {
  return cn(
    "tabular-nums",
    valueClassName === undefined || valueClassName.length === 0
      ? "text-2xl font-semibold truncate"
      : valueClassName,
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
      style={{ ...metricValueTextStyle(textSize), ...valueStyle }}
    >
      {children}
    </span>
  );
}

export function MetricDerivedValueDisplay({
  config,
  context = {},
  presentation = "card",
  className,
  style,
  valueClassName,
  valueStyle,
  textSize,
  cssText,
}: MetricDerivedValueDisplayProps) {
  const { t, i18n } = useTranslation("common");
  const derived = useMetricDerivedValue({
    expression: config.expression ?? [],
    terms: config.terms,
    groupBindings: config.groupBindings,
    dimensionBindings: config.dimensionBindings,
    context,
  });

  const inline = presentation === "inline";
  const statusClassName = "text-sm";
  const valueTextClassName = metricValueTextClassName(valueClassName);
  const defaultDisplayValue = formatDefaultMetricDisplayValue(
    derived.displayDefinition ?? { valueDisplayFormat: "number" },
    i18n.language,
  );

  const displayValue = useMemo(() => {
    if (derived.total === null || !derived.displayDefinition) {
      return null;
    }

    return formatDisplayValue(derived.total, {
      fieldType: "number",
      displayFormat:
        derived.displayDefinition.valueDisplayFormat === "currency"
          ? "currency"
          : "plain",
      locale: i18n.language,
    });
  }, [derived.displayDefinition, derived.total, i18n.language]);

  const title =
    config.label?.trim() ||
    derived.displayDefinition?.name ||
    t("metrics.derivedKpi.defaultLabel");

  const formulaPreview = useMemo(
    () =>
      formatMetricDerivedExpressionPreview(
        derived.expression,
        (metricDefinitionId) =>
          metricDefinitionId.trim().length > 0
            ? metricDefinitionId
            : t("metrics.derivedKpi.unnamedMetric"),
      ),
    [derived.expression, t],
  );

  if (derived.status === "unconfigured") {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
        cssText={cssText}
      >
        <Text variant="muted" className={statusClassName}>
          {t("metrics.derivedKpi.unconfigured")}
        </Text>
      </MetricValueShell>
    );
  }

  if (derived.status === "loading") {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
        cssText={cssText}
      >
        <Text variant="muted" className={statusClassName}>
          {t("metrics.widget.loading")}
        </Text>
      </MetricValueShell>
    );
  }

  if (derived.status === "forbidden") {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
        cssText={cssText}
      >
        <Text variant="muted" className={statusClassName}>
          {t("metrics.widget.forbidden")}
        </Text>
      </MetricValueShell>
    );
  }

  if (derived.status === "invalidExpression") {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
        cssText={cssText}
      >
        <Text variant="muted" className={statusClassName}>
          {t("metrics.derivedKpi.invalidExpression")}
        </Text>
      </MetricValueShell>
    );
  }

  if (derived.status === "divideByZero") {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
        cssText={cssText}
      >
        <Text variant="muted" className={statusClassName}>
          {t("metrics.derivedKpi.divideByZero")}
        </Text>
      </MetricValueShell>
    );
  }

  if (derived.status === "shapeMismatch") {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
        cssText={cssText}
      >
        <Text variant="muted" className={statusClassName}>
          {t("metrics.derivedKpi.shapeMismatch")}
        </Text>
      </MetricValueShell>
    );
  }

  if (derived.status === "error") {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
        cssText={cssText}
      >
        <Text variant="muted" className={statusClassName}>
          {t("metrics.widget.error")}
        </Text>
      </MetricValueShell>
    );
  }

  const renderedValue = displayValue ?? defaultDisplayValue;

  if (inline) {
    return (
      <MetricValueShell
        presentation={presentation}
        className={className}
        style={style}
        cssText={cssText}
      >
        <MetricKpiValueText
          valueClassName={valueTextClassName}
          valueStyle={valueStyle}
          textSize={textSize}
        >
          {renderedValue}
        </MetricKpiValueText>
      </MetricValueShell>
    );
  }

  return (
    <MetricValueShell
      presentation={presentation}
      className={className}
      style={style}
      cssText={cssText}
    >
      <Text className="text-muted-foreground text-xs">{title}</Text>
      {!inline && formulaPreview.length > 0 ? (
        <Text variant="muted" className="text-xs">
          {formulaPreview}
        </Text>
      ) : null}
      <MetricKpiValueText
        valueClassName={valueTextClassName}
        valueStyle={valueStyle}
        textSize={textSize}
      >
        {renderedValue}
      </MetricKpiValueText>
    </MetricValueShell>
  );
}
