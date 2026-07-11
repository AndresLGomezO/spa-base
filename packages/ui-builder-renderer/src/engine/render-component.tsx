import type { ReactNode } from "react";
import { resolveStaticImageSrc } from "@repo/entities";
import {
  conditionalRulesToBadgeVariants,
  isFieldUiComponent,
  isIconComponent,
  isNotificationBellComponent,
  isUserComponent,
  isSidebarCollapseComponent,
  isSidebarNavComponent,
  isSidebarTriggerComponent,
  isNavTabComponent,
  isDashboardSectionComponent,
  isMetricKpiComponent,
  isMetricDerivedKpiComponent,
  isMetricWidgetComponent,
  isChartComponent,
  isQueryViewerComponent,
  isViewSearchComponent,
  isViewFiltersComponent,
  isViewDateFilterComponent,
  isPageUiComponent,
  mergeConditionalCssText,
  resolveDefaultCompareFieldPath,
  type MatchedConditionalStyles,
  resolveFieldChain,
  filterComponentInnerStyleRules,
  resolvePageSlotWrapper,
  resolveMetricKpiPresentation,
  resolveComponentRenderStyles,
  resolveStyleRules,
  textWrapClassFromStyles,
  type FieldUiComponentConfig,
  type ImageComponentConfig,
  type ResponsiveGridBreakpoint,
  type UiComponentConfig,
} from "@repo/ui-builder-core";
import { ResponsiveStyleTag } from "../layout/ResponsiveStyleTag.js";
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
import {
  mergeMatchedConditionalClassName,
  mergeComponentStylesWithConditionalOverrides,
  resolveComponentConditionalStyles,
  wrapNodeWithConditionalStyles,
} from "./apply-entity-conditional-styles.js";

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

  if (context.formatFieldDisplayValue) {
    return context.formatFieldDisplayValue(fieldPath, rawValue);
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

function wrapListItemRelationLink(
  fieldPath: string,
  node: ReactNode,
  context: LayoutRenderContext,
): ReactNode {
  if (
    context.mode !== "listItem" ||
    fieldPath.includes(".") ||
    !context.resolveComponentClickTarget ||
    !context.componentClickWrapper
  ) {
    return node;
  }

  const target = context.resolveComponentClickTarget(
    {
      type: "entityRecord",
      target: { relationFieldPath: fieldPathRoot(fieldPath) },
    },
    { boundFieldPath: fieldPath },
  );
  if (!target || target.kind !== "link") {
    return node;
  }

  return context.componentClickWrapper(target, node, {
    linkAppearance: context.relationLinkAppearance ?? false,
  });
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

function resolveImageRenderOptions(config: ImageComponentConfig): {
  readonly fillContainer: boolean;
  readonly objectFit: "contain" | "cover" | "fill";
  readonly sizePx: number | undefined;
} {
  const isOverlay = config.displayMode === "overlay";
  return {
    fillContainer: isOverlay,
    objectFit: config.objectFit ?? (isOverlay ? "cover" : "contain"),
    sizePx: isOverlay ? undefined : config.imageSize,
  };
}

export function renderUiComponent(
  config: UiComponentConfig,
  context: LayoutRenderContext,
  atBreakpoint?: ResponsiveGridBreakpoint,
): ReactNode {
  if (isMetricKpiComponent(config)) {
    const node =
      context.metricKpiRenderer?.(
        config,
        resolveMetricKpiPresentation(config.styles, atBreakpoint),
      ) ?? null;
    const matched = resolveComponentConditionalStyles(
      config,
      context,
      atBreakpoint,
    );
    return wrapNodeWithConditionalStyles(node, matched);
  }

  if (isMetricDerivedKpiComponent(config)) {
    const node =
      context.metricDerivedKpiRenderer?.(
        config,
        resolveMetricKpiPresentation(config.styles, atBreakpoint),
      ) ?? null;
    const matched = resolveComponentConditionalStyles(
      config,
      context,
      atBreakpoint,
    );
    return wrapNodeWithConditionalStyles(node, matched);
  }

  if (isMetricWidgetComponent(config)) {
    const node = context.metricWidgetRenderer?.(config) ?? null;
    const matched = resolveComponentConditionalStyles(
      config,
      context,
      atBreakpoint,
    );
    return wrapNodeWithConditionalStyles(node, matched);
  }

  if (isQueryViewerComponent(config)) {
    const node = context.queryViewerRenderer?.(config) ?? null;
    const matched = resolveComponentConditionalStyles(
      config,
      context,
      atBreakpoint,
    );
    return wrapNodeWithConditionalStyles(node, matched);
  }

  if (isChartComponent(config)) {
    const node = context.chartRenderer?.(config) ?? null;
    const matched = resolveComponentConditionalStyles(
      config,
      context,
      atBreakpoint,
    );
    return wrapNodeWithConditionalStyles(node, matched);
  }

  if (isDashboardSectionComponent(config)) {
    return context.dashboardSectionRenderer?.(config) ?? null;
  }

  if (isViewSearchComponent(config)) {
    return context.viewSearchRenderer?.(config) ?? null;
  }

  if (isViewFiltersComponent(config)) {
    return context.viewFiltersRenderer?.(config) ?? null;
  }

  if (isViewDateFilterComponent(config)) {
    return context.viewDateFilterRenderer?.(config) ?? null;
  }

  if (config.kind === "form-field") {
    if (
      context.fieldAccessFilter &&
      !context.fieldAccessFilter(config.fieldPath)
    ) {
      return null;
    }
    const { containerClassName, containerStyle, cssText } =
      resolveComponentRenderStyles(config.styles, atBreakpoint);
    const matched = resolveComponentConditionalStyles(
      config,
      context,
      atBreakpoint,
      { defaultCompareFieldPath: config.fieldPath },
    );
    const mergedClassName = mergeMatchedConditionalClassName(
      containerClassName,
      matched,
    );
    const mergedCssText = mergeConditionalCssText(cssText, matched.cssText);
    const mergedStyle = { ...containerStyle, ...matched.style };
    const fieldNode =
      context.formFieldRenderer?.(config, mergedClassName) ?? null;
    if (!mergedCssText && Object.keys(mergedStyle).length === 0) {
      return fieldNode;
    }
    return (
      <>
        {mergedCssText ? <ResponsiveStyleTag cssText={mergedCssText} /> : null}
        <div style={mergedStyle}>{fieldNode}</div>
      </>
    );
  }

  if (config.kind === "entity-field-selector") {
    if (
      context.fieldAccessFilter &&
      !context.fieldAccessFilter(config.fieldPath)
    ) {
      return null;
    }
    const { containerClassName, containerStyle, cssText } =
      resolveComponentRenderStyles(config.styles, atBreakpoint);
    const matched = resolveComponentConditionalStyles(
      config,
      context,
      atBreakpoint,
      { defaultCompareFieldPath: config.fieldPath },
    );
    const mergedClassName = mergeMatchedConditionalClassName(
      containerClassName,
      matched,
    );
    const mergedCssText = mergeConditionalCssText(cssText, matched.cssText);
    const mergedStyle = { ...containerStyle, ...matched.style };
    const selectorNode =
      context.entityFieldSelectorRenderer?.(config, mergedClassName) ?? null;
    if (!mergedCssText && Object.keys(mergedStyle).length === 0) {
      return selectorNode;
    }
    return (
      <>
        {mergedCssText ? <ResponsiveStyleTag cssText={mergedCssText} /> : null}
        <div style={mergedStyle}>{selectorNode}</div>
      </>
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
      const slotWrapper = resolvePageSlotWrapper(config.styles, {
        baseClassName: extraClassName,
        atBreakpoint,
      });
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
          <ResponsiveStyleTag cssText={slotWrapper.cssText} />
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
    const styledConfig = mergeComponentStylesWithConditionalOverrides(
      config,
      context,
      atBreakpoint,
    );
    return context.lucideIconRenderer?.(styledConfig, atBreakpoint) ?? null;
  }

  if (isUserComponent(config)) {
    const styledConfig = mergeComponentStylesWithConditionalOverrides(
      config,
      context,
      atBreakpoint,
    );
    return context.userRenderer?.(styledConfig) ?? null;
  }

  if (isNotificationBellComponent(config)) {
    const styledConfig = mergeComponentStylesWithConditionalOverrides(
      config,
      context,
      atBreakpoint,
    );
    return context.notificationBellRenderer?.(styledConfig) ?? null;
  }

  if (isSidebarNavComponent(config)) {
    const node = context.sidebarNavRenderer?.(config) ?? null;
    const matched = resolveComponentConditionalStyles(
      config,
      context,
      atBreakpoint,
    );
    return wrapNodeWithConditionalStyles(node, matched);
  }

  if (isSidebarCollapseComponent(config)) {
    const node = context.sidebarCollapseRenderer?.(config) ?? null;
    const matched = resolveComponentConditionalStyles(
      config,
      context,
      atBreakpoint,
    );
    return wrapNodeWithConditionalStyles(node, matched);
  }

  if (isSidebarTriggerComponent(config)) {
    const node = context.sidebarTriggerRenderer?.(config) ?? null;
    const matched = resolveComponentConditionalStyles(
      config,
      context,
      atBreakpoint,
    );
    return wrapNodeWithConditionalStyles(node, matched);
  }

  if (isNavTabComponent(config)) {
    const node = context.navTabRenderer?.(config) ?? null;
    const matched = resolveComponentConditionalStyles(
      config,
      context,
      atBreakpoint,
    );
    return wrapNodeWithConditionalStyles(node, matched);
  }

  if (!isFieldUiComponent(config)) {
    return null;
  }

  const innerStyles = filterComponentInnerStyleRules(config.styles);
  const {
    containerClassName,
    textClassName,
    containerStyle,
    valueStyle,
    textSize,
    cssText,
  } = resolveComponentRenderStyles(innerStyles, atBreakpoint);

  const withResponsiveCss = (
    node: ReactNode,
    extraCssText?: string,
  ): ReactNode => {
    const mergedCssText = mergeConditionalCssText(cssText, extraCssText);
    if (!mergedCssText) {
      return node;
    }
    return (
      <>
        <ResponsiveStyleTag cssText={mergedCssText} />
        {node}
      </>
    );
  };

  const mergeMatchedClassName = (
    baseClassName: string | undefined,
    matched: MatchedConditionalStyles,
  ): string => mergeMatchedConditionalClassName(baseClassName, matched);

  const resolveFieldConditionalStyles = (
    boundFieldPath?: string,
  ): MatchedConditionalStyles =>
    resolveComponentConditionalStyles(config, context, atBreakpoint, {
      defaultCompareFieldPath:
        boundFieldPath ?? resolveDefaultCompareFieldPath(config),
      boundFieldPath,
      dateDisplayFormat:
        config.kind === "date" ? config.dateDisplayFormat : undefined,
    });

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
    const matched = resolveFieldConditionalStyles();
    return withResponsiveCss(
      <CardFieldValue
        value={chain.staticValue}
        allowEmpty
        className={mergeMatchedClassName(containerClassName, matched)}
        style={{ ...containerStyle, ...matched.style }}
        valueClassName={valueClassNameFromStyles(innerStyles, textClassName)}
        textSize={textSize}
        valueStyle={valueStyle}
        {...textPropsFromLabel(config)}
        label={labelFromConfig(config, "", context)}
      />,
      matched.cssText,
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
    const imageRenderOptions = resolveImageRenderOptions(config);
    const matched = resolveFieldConditionalStyles(fieldPath);
    const imageClassName = mergeMatchedClassName(containerClassName, matched);
    const imageStyle = { ...containerStyle, ...matched.style };
    if (context.resolveImage) {
      const primaryFieldPath =
        config.primary.type === "field" ? config.primary.path.trim() : "";
      return context.resolveImage(fieldPath, rawValue, {
        primaryFieldPath,
        imageSize: imageRenderOptions.sizePx,
        fillContainer: imageRenderOptions.fillContainer,
        objectFit: imageRenderOptions.objectFit,
        className: imageClassName,
        style: imageStyle,
      });
    }

    const src = resolveStaticImageSrc(rawValue);

    return withResponsiveCss(
      <CardFieldImage
        src={src}
        alt={label ?? fieldPath}
        sizePx={imageRenderOptions.sizePx}
        fillContainer={imageRenderOptions.fillContainer}
        objectFit={imageRenderOptions.objectFit}
        className={imageClassName}
        style={imageStyle}
      />,
      matched.cssText,
    );
  }

  if (config.kind === "badge") {
    const formatted = formatRawDisplayValue(rawValue, fieldPath, meta, context);
    const { value: badgeValue } = resolveFieldDisplayValue(
      fieldPath,
      formatted,
      context,
    );
    const matched = resolveFieldConditionalStyles(fieldPath);
    const badgeContainer = resolveStyleRules(innerStyles, {
      baseClassName: mergeMatchedClassName(undefined, matched),
      atBreakpoint,
    });

    return withResponsiveCss(
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
        style={{ ...badgeContainer.style, ...matched.style }}
      />,
      matched.cssText,
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
      return withResponsiveCss(
        <CardFieldValue
          label={label}
          value={displayValue}
          allowEmpty={isSample}
          className={containerClassName}
          style={containerStyle}
          valueClassName={valueClassNameFromStyles(
            innerStyles,
            sampleValueClassName(textClassName, isSample),
          )}
          textSize={textSize}
          valueStyle={valueStyle}
          {...textPropsFromLabel(config)}
        />,
      );
    }

    const matched = resolveFieldConditionalStyles(fieldPath);

    return withResponsiveCss(
      <CardFieldCurrency
        amount={displayValue}
        currency={showCurrency ? context.resolveCurrencyCode?.() : undefined}
        tone={showToneColors ? resolveCurrencyTone(rawValue) : "neutral"}
        label={label}
        className={containerClassName}
        style={containerStyle}
        valueClassName={valueClassNameFromStyles(
          innerStyles,
          mergeMatchedClassName(textClassName, matched),
        )}
        textSize={textSize}
        valueStyle={{ ...valueStyle, ...matched.style }}
        showToneColors={showToneColors}
        {...textPropsFromLabel(config)}
      />,
      matched.cssText,
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
      return withResponsiveCss(
        <CardFieldValue
          label={label}
          value={displayValue}
          allowEmpty={isSample}
          className={containerClassName}
          style={containerStyle}
          valueClassName={valueClassNameFromStyles(
            innerStyles,
            sampleValueClassName(textClassName, isSample),
          )}
          textSize={textSize}
          valueStyle={valueStyle}
          {...textPropsFromLabel(config)}
        />,
      );
    }

    const dateDisplayFormat =
      config.dateDisplayFormat ?? meta.dateDisplayFormat ?? "datetime";
    const matched = resolveFieldConditionalStyles(fieldPath);

    return withResponsiveCss(
      <CardFieldDate
        value={rawValue}
        dateDisplayFormat={dateDisplayFormat}
        locale={context.locale}
        label={label}
        className={containerClassName}
        style={containerStyle}
        valueClassName={valueClassNameFromStyles(
          innerStyles,
          mergeMatchedClassName(textClassName, matched),
        )}
        textSize={textSize}
        valueStyle={{ ...valueStyle, ...matched.style }}
        {...textPropsFromLabel(config)}
      />,
      matched.cssText,
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
  const matched = resolveFieldConditionalStyles(fieldPath);

  return wrapListItemRelationLink(
    fieldPath,
    withResponsiveCss(
      <CardFieldValue
        label={label}
        value={displayValue}
        allowEmpty={isSample}
        className={containerClassName}
        style={containerStyle}
        valueClassName={valueClassNameFromStyles(
          innerStyles,
          mergeMatchedClassName(
            sampleValueClassName(textClassName, isSample),
            matched,
          ),
        )}
        textSize={textSize}
        valueStyle={{ ...valueStyle, ...matched.style }}
        {...textPropsFromLabel(config)}
      />,
      matched.cssText,
    ),
    context,
  );
}
