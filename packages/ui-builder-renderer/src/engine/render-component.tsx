import type { ReactNode } from "react";
import { resolveStaticImageSrc } from "@repo/entities";
import {
  conditionalRulesToBadgeVariants,
  fontSizePxFromStyles,
  isFieldUiComponent,
  isIconComponent,
  isMetricKpiComponent,
  isMetricWidgetComponent,
  isPageUiComponent,
  matchConditionalStyles,
  resolveFieldChain,
  resolvePageSlotWrapper,
  resolveMetricKpiPresentation,
  resolveStyleRules,
  layoutInlineStyleFromStyleRules,
  textInlineStyleFromStyleRules,
  splitStyleRuleClasses,
  textWrapClassFromStyles,
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
import type { FieldDisplayMeta } from "../context.js";

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

function formatRawDisplayValue(
  rawValue: unknown,
  fieldPath: string,
  meta: FieldDisplayMeta,
  context: LayoutRenderContext,
): string {
  const rootField = fieldPathRoot(fieldPath);

  if (meta.isArray && Array.isArray(rawValue)) {
    if (rawValue.length === 0) {
      return "—";
    }

    return rawValue
      .map((item) =>
        formatDisplayValue(item, {
          fieldType: meta.fieldType,
          displayFormat: meta.displayFormat,
          dateDisplayFormat: meta.dateDisplayFormat,
          fieldName: rootField,
          locale: context.locale,
        }),
      )
      .join(", ");
  }

  return formatDisplayValue(rawValue, {
    fieldType: meta.fieldType,
    displayFormat: meta.displayFormat,
    dateDisplayFormat: meta.dateDisplayFormat,
    fieldName: rootField,
    locale: context.locale,
  });
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

function valueClassNameFromStyles(
  styles: FieldUiComponentConfig["styles"],
  textClassName: string,
  extra?: string,
): string {
  return [textWrapClassFromStyles(styles), textClassName, extra]
    .filter(Boolean)
    .join(" ");
}

export function renderUiComponent(
  config: UiComponentConfig,
  context: LayoutRenderContext,
): ReactNode {
  if (isMetricKpiComponent(config)) {
    return (
      context.metricKpiRenderer?.(
        config,
        resolveMetricKpiPresentation(config.styles),
      ) ?? null
    );
  }

  if (isMetricWidgetComponent(config)) {
    return context.metricWidgetRenderer?.(config) ?? null;
  }

  if (config.kind === "form-field") {
    if (
      context.fieldAccessFilter &&
      !context.fieldAccessFilter(config.fieldPath)
    ) {
      return null;
    }
    const { containerClassName } = splitStyleRuleClasses(config.styles);
    return context.formFieldRenderer?.(config, containerClassName) ?? null;
  }

  if (config.kind === "entity-field-selector") {
    if (
      context.fieldAccessFilter &&
      !context.fieldAccessFilter(config.fieldPath)
    ) {
      return null;
    }
    const { containerClassName } = splitStyleRuleClasses(config.styles);
    return (
      context.entityFieldSelectorRenderer?.(config, containerClassName) ?? null
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

  if (config.kind === "wizard-progress") {
    return context.wizardProgressRenderer?.(config) ?? null;
  }

  if (config.kind === "wizard-step-host") {
    return context.wizardStepHostRenderer?.(config) ?? null;
  }

  if (config.kind === "wizard-actions") {
    return context.wizardActionsRenderer?.(config) ?? null;
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
    const wrap = (
      node: ReactNode,
      extraClassName?: string,
      options?: { readonly attachPageListScrollRef?: boolean },
    ) => {
      const slotWrapper = resolvePageSlotWrapper(config.styles, extraClassName);
      return (
        <div
          ref={
            options?.attachPageListScrollRef
              ? context.registerPageListScrollElement
              : undefined
          }
          data-entity-page-list-scroll={
            options?.attachPageListScrollRef ? "" : undefined
          }
          className={slotWrapper.className}
          style={slotWrapper.style}
        >
          {node}
        </div>
      );
    };
    switch (config.kind) {
      case "page-header":
        return wrap(context.pageHeaderRenderer?.() ?? null);
      case "page-toolbar":
        return wrap(
          context.pageToolbarRenderer?.() ?? null,
          "relative z-20 shrink-0",
        );
      case "page-metrics":
        return wrap(context.pageMetricsRenderer?.() ?? null);
      case "page-list": {
        const list = context.pageListRenderer?.() ?? null;
        if (context.mode === "mainPage" && context.wrapPageListScroll) {
          return context.wrapPageListScroll(list);
        }
        return wrap(
          list,
          context.mode === "mainPage"
            ? "relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
            : undefined,
          {
            attachPageListScrollRef: context.mode === "mainPage",
          },
        );
      }
    }
  }

  if (isIconComponent(config)) {
    return context.lucideIconRenderer?.(config) ?? null;
  }

  if (!isFieldUiComponent(config)) {
    return null;
  }

  const { containerClassName, textClassName } = splitStyleRuleClasses(
    config.styles,
  );
  const containerStyle = layoutInlineStyleFromStyleRules(config.styles);
  const valueStyle = textInlineStyleFromStyleRules(config.styles);
  const textSize = fontSizePxFromStyles(config.styles);

  const chain = resolveFieldChain({
    primary: config.primary,
    fallbacks: config.fallbacks,
    kind: config.kind,
    resolveField: context.resolveField,
    isImagePresent: context.isImagePresent,
  });

  if (
    chain.usedStatic &&
    chain.staticValue !== undefined &&
    config.kind !== "image"
  ) {
    return (
      <CardFieldValue
        value={chain.staticValue}
        allowEmpty
        className={containerClassName}
        style={containerStyle}
        valueClassName={valueClassNameFromStyles(config.styles, textClassName)}
        textSize={textSize}
        valueStyle={valueStyle}
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
  const meta = context.resolveFieldMeta?.(fieldPath) ?? {};
  const label =
    labelFromConfig(config, fieldPath, context) ??
    context.resolveFieldLabel?.(fieldPath);

  if (config.kind === "image") {
    if (context.resolveImage) {
      const primaryFieldPath =
        config.primary.type === "field" ? config.primary.path.trim() : "";
      return context.resolveImage(fieldPath, rawValue, {
        primaryFieldPath,
        imageSize: config.imageSize,
        className: containerClassName,
        style: containerStyle,
      });
    }

    const src = resolveStaticImageSrc(rawValue);

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
    const formatted = formatRawDisplayValue(rawValue, fieldPath, meta, context);
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
    const formatted = formatRawDisplayValue(
      rawValue,
      fieldPath,
      {
        ...meta,
        fieldType: meta.fieldType ?? "number",
        displayFormat,
      },
      context,
    );
    const { value: displayValue, isSample } = resolveFieldDisplayValue(
      fieldPath,
      formatted,
      context,
    );

    if (isSample || (meta.isArray && Array.isArray(rawValue))) {
      return (
        <CardFieldValue
          label={label}
          value={displayValue}
          allowEmpty={isSample}
          className={containerClassName}
          style={containerStyle}
          valueClassName={valueClassNameFromStyles(
            config.styles,
            sampleValueClassName(textClassName, isSample),
          )}
          textSize={textSize}
          valueStyle={valueStyle}
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
        valueClassName={valueClassNameFromStyles(config.styles, textClassName)}
        textSize={textSize}
        {...textPropsFromLabel(config)}
      />
    );
  }

  if (config.kind === "date") {
    const formatted = formatRawDisplayValue(
      rawValue,
      fieldPath,
      {
        ...meta,
        fieldType: meta.fieldType ?? "date",
        dateDisplayFormat:
          config.dateDisplayFormat ?? meta.dateDisplayFormat ?? "datetime",
      },
      context,
    );
    const { value: displayValue, isSample } = resolveFieldDisplayValue(
      fieldPath,
      formatted,
      context,
    );

    if (isSample || (meta.isArray && Array.isArray(rawValue))) {
      return (
        <CardFieldValue
          label={label}
          value={displayValue}
          allowEmpty={isSample}
          className={containerClassName}
          style={containerStyle}
          valueClassName={valueClassNameFromStyles(
            config.styles,
            sampleValueClassName(textClassName, isSample),
          )}
          textSize={textSize}
          valueStyle={valueStyle}
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
        valueClassName={valueClassNameFromStyles(config.styles, textClassName)}
        textSize={textSize}
        {...textPropsFromLabel(config)}
      />
    );
  }

  const recordLink = context.resolveRecordFieldLink?.(fieldPath);
  if (recordLink) {
    if (context.recordFieldLinkRenderer) {
      return (
        <CardFieldValue
          label={label}
          value={context.recordFieldLinkRenderer(recordLink)}
          allowEmpty
          className={containerClassName}
          style={containerStyle}
          valueClassName={valueClassNameFromStyles(
            config.styles,
            textClassName,
          )}
          textSize={textSize}
          {...textPropsFromLabel(config)}
        />
      );
    }

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
        valueClassName={valueClassNameFromStyles(config.styles, textClassName)}
        textSize={textSize}
        valueStyle={valueStyle}
        {...textPropsFromLabel(config)}
      />
    );
  }

  const formattedValue = formatRawDisplayValue(
    rawValue,
    fieldPath,
    meta,
    context,
  );
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
      valueClassName={valueClassNameFromStyles(
        config.styles,
        sampleValueClassName(textClassName, isSample),
      )}
      textSize={textSize}
      valueStyle={valueStyle}
      {...textPropsFromLabel(config)}
    />
  );
}
