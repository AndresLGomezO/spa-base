import type { ReactNode } from "react";
import {
  conditionalRulesToBadgeVariants,
  fontSizePxFromStyles,
  isFieldUiComponent,
  isMetricKpiComponent,
  isPageUiComponent,
  matchConditionalStyles,
  resolveFieldChain,
  resolveStyleRules,
  spacingStyleFromStyleRules,
  splitStyleRuleClasses,
  type FieldUiComponentConfig,
  type UiComponentConfig,
} from "@repo/ui-builder-core";
import {
  CardFieldBadge,
  CardFieldCurrency,
  CardFieldDate,
  CardFieldImage,
  CardFieldValue,
  formatDisplayValue,
  resolveBadgeVariant,
  resolveCurrencyTone,
} from "@repo/ui";

import type { LayoutRenderContext } from "../context.js";

function resolveFieldDisplayValue(
  fieldPath: string,
  formatted: string,
  context: LayoutRenderContext,
): { readonly value: string; readonly isSample: boolean } {
  if (formatted !== "—") {
    return { value: formatted, isSample: false };
  }

  const sample = context.resolvePreviewSampleValue?.(fieldPath);
  if (sample) {
    return { value: sample, isSample: true };
  }

  return { value: formatted, isSample: false };
}

function sampleValueClassName(
  textClassName: string,
  isSample: boolean,
): string {
  return [textClassName, isSample ? "text-muted-foreground" : ""]
    .filter(Boolean)
    .join(" ");
}

function fieldPathRoot(fieldPath: string): string {
  return fieldPath.includes(".")
    ? (fieldPath.split(".")[0] ?? fieldPath)
    : fieldPath;
}

function labelFromConfig(
  config: FieldUiComponentConfig,
  resolvedPath: string,
  context: LayoutRenderContext,
): string | undefined {
  if (config.label?.text) {
    return config.label.text;
  }
  if (config.label?.show && resolvedPath) {
    return context.resolveFieldLabel?.(resolvedPath);
  }
  return undefined;
}

function labelAlignClassName(
  align?: "left" | "center" | "right",
): string | undefined {
  if (align === "center") {
    return "text-center";
  }
  if (align === "right") {
    return "text-right";
  }
  if (align === "left") {
    return "text-left";
  }
  return undefined;
}

function textPropsFromLabel(config: FieldUiComponentConfig) {
  return {
    showLabel: config.label?.show ?? false,
    labelPosition: config.label?.position ?? ("above" as const),
    textBold: config.label?.bold,
    textThin: config.label?.thin,
    textItalic: config.label?.italic,
    textUnderline: config.label?.underline,
    textColor: config.label?.color,
    labelClassName: labelAlignClassName(config.label?.align),
  };
}

export function renderUiComponent(
  config: UiComponentConfig,
  context: LayoutRenderContext,
): ReactNode {
  if (isMetricKpiComponent(config)) {
    return context.metricKpiRenderer?.(config) ?? null;
  }

  if (config.kind === "form-field") {
    if (
      context.fieldAccessFilter &&
      !context.fieldAccessFilter(config.fieldPath)
    ) {
      return null;
    }
    const { containerClassName } = splitStyleRuleClasses(config.styles);
    return (
      context.formFieldRenderer?.(config.fieldPath, containerClassName) ?? null
    );
  }

  if (config.kind === "form-section") {
    return (
      context.formSectionRenderer?.(config.title, null) ??
      (config.title ? (
        <div className="text-sm font-medium">{config.title}</div>
      ) : null)
    );
  }

  if (config.kind === "form-actions") {
    return context.formActionsRenderer?.() ?? null;
  }

  if (config.kind === "related-records") {
    return (
      context.relatedRecordsRenderer?.({
        childEntity: config.childEntity,
        foreignKeyField: config.foreignKeyField,
      }) ?? null
    );
  }

  if (isPageUiComponent(config)) {
    const { containerClassName } = splitStyleRuleClasses(config.styles);
    const wrap = (node: ReactNode) =>
      containerClassName ? (
        <div className={containerClassName}>{node}</div>
      ) : (
        node
      );
    switch (config.kind) {
      case "page-header":
        return wrap(context.pageHeaderRenderer?.() ?? null);
      case "page-toolbar":
        return wrap(context.pageToolbarRenderer?.() ?? null);
      case "page-metrics":
        return wrap(context.pageMetricsRenderer?.() ?? null);
      case "page-list":
        return wrap(context.pageListRenderer?.() ?? null);
    }
  }

  if (!isFieldUiComponent(config)) {
    return null;
  }

  const { containerClassName, textClassName } = splitStyleRuleClasses(
    config.styles,
  );
  const containerStyle = spacingStyleFromStyleRules(config.styles);
  const textSize = fontSizePxFromStyles(config.styles);

  const chain = resolveFieldChain({
    primary: config.primary,
    fallbacks: config.fallbacks,
    kind: config.kind,
    resolveField: context.resolveField,
    isImagePresent: context.isImagePresent,
  });

  if (chain.usedStatic && chain.staticValue !== undefined) {
    return (
      <CardFieldValue
        value={chain.staticValue}
        allowEmpty
        className={containerClassName}
        style={containerStyle}
        valueClassName={textClassName}
        textSize={textSize}
        {...textPropsFromLabel(config)}
        label={labelFromConfig(config, "", context)}
      />
    );
  }

  const fieldPath = chain.fieldPath;
  if (
    fieldPath &&
    context.fieldAccessFilter &&
    !context.fieldAccessFilter(fieldPath)
  ) {
    return null;
  }
  const rawValue = chain.rawValue;
  const rootField = fieldPathRoot(fieldPath);
  const meta = context.resolveFieldMeta?.(fieldPath) ?? {};
  const label =
    labelFromConfig(config, fieldPath, context) ??
    context.resolveFieldLabel?.(fieldPath);

  if (config.kind === "image") {
    if (context.resolveImage) {
      const primaryFieldPath =
        config.primary.type === "field" ? config.primary.path.trim() : "";
      return (
        <div className={containerClassName} style={containerStyle}>
          {context.resolveImage(fieldPath, rawValue, {
            primaryFieldPath,
            imageSize: config.imageSize,
          })}
        </div>
      );
    }

    const src =
      typeof rawValue === "string"
        ? rawValue
        : rawValue && typeof rawValue === "object" && "downloadUrl" in rawValue
          ? String((rawValue as { downloadUrl?: string }).downloadUrl ?? "")
          : undefined;

    return (
      <CardFieldImage
        src={src}
        alt={label ?? fieldPath}
        sizePx={config.imageSize}
        className={containerClassName}
        style={containerStyle}
      />
    );
  }

  if (config.kind === "badge") {
    const formatted = formatDisplayValue(rawValue, {
      fieldType: meta.fieldType,
      displayFormat: meta.displayFormat,
      dateDisplayFormat: meta.dateDisplayFormat,
      fieldName: rootField,
      locale: context.locale,
    });
    const { value: badgeValue } = resolveFieldDisplayValue(
      fieldPath,
      formatted,
      context,
    );
    const matched = matchConditionalStyles(rawValue, config.conditionalStyles);
    const badgeContainer = resolveStyleRules(config.styles, matched.className);

    return (
      <CardFieldBadge
        value={badgeValue}
        variant={resolveBadgeVariant(
          rawValue,
          conditionalRulesToBadgeVariants(config.conditionalStyles) ??
            (matched.badgeVariant
              ? { [String(rawValue ?? "")]: matched.badgeVariant }
              : undefined),
          badgeValue,
        )}
        className={badgeContainer.className}
        style={badgeContainer.style}
      />
    );
  }

  if (config.kind === "numeric") {
    const displayFormat = config.displayFormat ?? "plain";
    const showCurrency = config.showCurrency ?? false;
    const showToneColors = config.showToneColors ?? false;
    const formatted = formatDisplayValue(rawValue, {
      fieldType: meta.fieldType ?? "number",
      displayFormat,
      fieldName: rootField,
      locale: context.locale,
    });
    const { value: displayValue, isSample } = resolveFieldDisplayValue(
      fieldPath,
      formatted,
      context,
    );

    if (isSample) {
      return (
        <CardFieldValue
          label={label}
          value={displayValue}
          allowEmpty
          className={containerClassName}
          style={containerStyle}
          valueClassName={sampleValueClassName(textClassName, true)}
          textSize={textSize}
          {...textPropsFromLabel(config)}
        />
      );
    }

    return (
      <CardFieldCurrency
        amount={displayValue}
        currency={showCurrency ? context.resolveCurrencyCode?.() : undefined}
        tone={showToneColors ? resolveCurrencyTone(rawValue) : "neutral"}
        label={label}
        className={containerClassName}
        style={containerStyle}
        valueClassName={textClassName}
        textSize={textSize}
        {...textPropsFromLabel(config)}
      />
    );
  }

  if (config.kind === "date") {
    const formatted = formatDisplayValue(rawValue, {
      fieldType: meta.fieldType ?? "date",
      dateDisplayFormat:
        config.dateDisplayFormat ?? meta.dateDisplayFormat ?? "datetime",
      fieldName: rootField,
      locale: context.locale,
    });
    const { value: displayValue, isSample } = resolveFieldDisplayValue(
      fieldPath,
      formatted,
      context,
    );

    if (isSample) {
      return (
        <CardFieldValue
          label={label}
          value={displayValue}
          allowEmpty
          className={containerClassName}
          style={containerStyle}
          valueClassName={sampleValueClassName(textClassName, true)}
          textSize={textSize}
          {...textPropsFromLabel(config)}
        />
      );
    }

    return (
      <CardFieldDate
        value={rawValue}
        dateDisplayFormat={
          config.dateDisplayFormat ?? meta.dateDisplayFormat ?? "datetime"
        }
        locale={context.locale}
        label={label}
        className={containerClassName}
        style={containerStyle}
        valueClassName={textClassName}
        textSize={textSize}
        {...textPropsFromLabel(config)}
      />
    );
  }

  const recordLink = context.resolveRecordFieldLink?.(fieldPath);
  if (recordLink) {
    return (
      <CardFieldValue
        label={label}
        value={
          <a href={recordLink.href} className="text-primary underline">
            {recordLink.label}
          </a>
        }
        allowEmpty
        className={containerClassName}
        style={containerStyle}
        valueClassName={textClassName}
        textSize={textSize}
        {...textPropsFromLabel(config)}
      />
    );
  }

  const formattedValue = formatDisplayValue(rawValue, {
    fieldType: meta.fieldType,
    displayFormat: meta.displayFormat,
    dateDisplayFormat: meta.dateDisplayFormat,
    fieldName: rootField,
    locale: context.locale,
  });
  const { value: displayValue, isSample } = resolveFieldDisplayValue(
    fieldPath,
    formattedValue,
    context,
  );

  return (
    <CardFieldValue
      label={label}
      value={displayValue}
      allowEmpty={isSample}
      className={containerClassName}
      style={containerStyle}
      valueClassName={sampleValueClassName(textClassName, isSample)}
      textSize={textSize}
      {...textPropsFromLabel(config)}
    />
  );
}
