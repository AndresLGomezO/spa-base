/**
 * @ai-context-sync
 * When changing UI builder layout schemas, run: pnpm generate:ai-context
 * Affected fragments: ui.layout.base, ui.style-rules, ui.data-sources, ui.components.*
 */
import { z } from "zod";

import {
  MAX_DERIVED_EXPRESSION_TOKENS,
  MAX_DERIVED_METRIC_EXPRESSION_METRICS,
  migrateLegacyDerivedTerms,
  validateDerivedExpressionGrammar,
} from "../metrics/derived-expression.js";
import { motionPresetSchema } from "./motion-schema.js";

const dataSourceSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("field"),
      path: z.string().trim().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("static"),
      value: z.string(),
    })
    .strict(),
]);

const entityNavigationTargetSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("current") }).strict(),
  z
    .object({
      scope: z.literal("relation"),
      relationFieldPath: z.string().trim().min(1),
    })
    .strict(),
  z
    .object({
      scope: z.literal("entity"),
      entityName: z.string().trim().min(1),
    })
    .strict(),
]);

const entityFormPrefillSourceSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("field"),
      path: z.string().trim().min(1),
    })
    .strict(),
  z.object({ type: z.literal("currentDate") }).strict(),
  z
    .object({
      type: z.literal("enumValue"),
      value: z.string().trim().min(1),
    })
    .strict(),
]);

const entityFormPrefillMappingSchema = z
  .object({
    targetField: z.string().trim().min(1),
    source: entityFormPrefillSourceSchema,
    fallback: entityFormPrefillSourceSchema.optional(),
  })
  .strict();

const componentClickActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("entityRecord"),
      target: z.union([
        z.literal("current"),
        z
          .object({
            relationFieldPath: z.string().trim().min(1),
          })
          .strict(),
      ]),
    })
    .strict(),
  z
    .object({
      type: z.literal("entityView"),
      view: z.enum(["recordDetail", "recordEditForm", "entityList"]),
      target: entityNavigationTargetSchema,
      formDesignId: z.string().trim().min(1).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("entityCreateForm"),
      target: entityNavigationTargetSchema,
      prefill: z.array(entityFormPrefillMappingSchema).optional(),
      formDesignId: z.string().trim().min(1).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("externalUrl"),
      url: dataSourceSchema,
      openInNewTab: z.boolean().optional(),
    })
    .strict(),
]);

const stylePropertySchema = z.enum([
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "padding",
  "gap",
  "backgroundColor",
  "color",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "textAlign",
  "textWrap",
  "letterSpacing",
  "alignItems",
  "justifyContent",
  "alignSelf",
  "flex",
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "minHeight",
  "maxHeight",
  "top",
  "right",
  "bottom",
  "left",
  "position",
  "zIndex",
  "pointerEvents",
  "opacity",
  "backdropFilter",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderWidth",
  "borderColor",
  "borderStyle",
  "boxShadow",
  "flexWrap",
  "overflowX",
  "overflowY",
  "gridColumns",
  "gridColumnsSm",
  "gridColumnsMd",
  "gridColumnsLg",
  "gridColumnsXl",
  "gridAutoFitMinWidth",
  "gridResponsiveMode",
]);

const themeTokenSchema = z.enum([
  "default",
  "muted",
  "primary",
  "success",
  "warning",
  "danger",
  "info",
  "background",
  "foreground",
  "transparent",
]);

const responsiveGridBreakpointSchema = z.enum(["base", "sm", "md", "lg", "xl"]);

const shadowTokenSchema = z.enum(["none", "card"]);

const styleRuleValueSchema = z.union([
  z.string(),
  themeTokenSchema,
  shadowTokenSchema,
]);

export const styleRuleSchema = z
  .object({
    property: stylePropertySchema,
    value: styleRuleValueSchema.optional(),
    valuesByBreakpoint: z
      .object({
        base: styleRuleValueSchema.optional(),
        sm: styleRuleValueSchema.optional(),
        md: styleRuleValueSchema.optional(),
        lg: styleRuleValueSchema.optional(),
        xl: styleRuleValueSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (rule) =>
      rule.value !== undefined ||
      (rule.valuesByBreakpoint !== undefined &&
        Object.values(rule.valuesByBreakpoint).some(
          (entry) => entry !== undefined,
        )),
    { message: "Style rule requires value or valuesByBreakpoint" },
  );

const labelConfigSchema = z
  .object({
    show: z.boolean().optional(),
    text: z.string().optional(),
    position: z.enum(["above", "below"]).optional(),
    bold: z.boolean().optional(),
    thin: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    color: z
      .enum([
        "default",
        "muted",
        "primary",
        "success",
        "warning",
        "danger",
        "info",
      ])
      .optional(),
    align: z.enum(["left", "center", "right"]).optional(),
  })
  .strict();

const conditionalStyleRuleSchema = z
  .object({
    matchValue: z.string(),
    compareFieldPath: z.string().trim().min(1).optional(),
    compareFieldDateFormat: z
      .enum(["date", "datetime", "time", "daysRemaining"])
      .optional(),
    styles: z.array(styleRuleSchema).optional(),
    background: z.string().trim().min(1).optional(),
    textColor: z.string().trim().min(1).optional(),
    badgeVariant: z
      .enum([
        "success",
        "warning",
        "danger",
        "info",
        "default",
        "active",
        "pending",
        "closed",
        "neutral",
      ])
      .optional(),
  })
  .strict();

const optionalConditionalStylesSchema = {
  conditionalStyles: z.array(conditionalStyleRuleSchema).optional(),
} as const;

const metricBindingSourceSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("static"),
      value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.string().trim().min(1)).min(1),
      ]),
    })
    .strict(),
  z
    .object({
      type: z.literal("entityField"),
      fieldPath: z.string().trim().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("listFilter"),
      field: z.string().trim().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("routeParam"),
      param: z.string().trim().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("dashboardDateFilter"),
    })
    .strict(),
  z
    .object({
      type: z.literal("relativePeriod"),
      field: z.string().trim().min(1),
      anchor: z.enum([
        "dashboardDateFilter",
        "listFilter",
        "routeParam",
        "now",
      ]),
      offset: z.number().int(),
      unit: z.enum(["day", "month", "year"]),
      anchorField: z.string().trim().min(1).optional(),
      anchorParam: z.string().trim().min(1).optional(),
    })
    .strict(),
]);

const metricDerivedLegacyTermSchema = z
  .object({
    metricDefinitionId: z.string(),
    multiplier: z.number().finite(),
  })
  .strict();

export const metricDerivedExpressionTokenSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("metric"),
      metricDefinitionId: z.string(),
    })
    .strict(),
  z
    .object({
      type: z.literal("constant"),
      value: z.number().finite(),
    })
    .strict(),
  z
    .object({
      type: z.literal("operator"),
      op: z.enum(["+", "-", "*", "/"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("paren"),
      side: z.enum(["open", "close"]),
    })
    .strict(),
]);

const metricDerivedKpiSchema = z
  .object({
    kind: z.literal("metric-derived-kpi"),
    label: z.string().optional(),
    expression: z
      .array(metricDerivedExpressionTokenSchema)
      .min(1)
      .max(MAX_DERIVED_EXPRESSION_TOKENS)
      .optional(),
    terms: z
      .array(metricDerivedLegacyTermSchema)
      .min(2)
      .max(MAX_DERIVED_METRIC_EXPRESSION_METRICS)
      .optional(),
    groupBindings: z.record(z.string(), metricBindingSourceSchema),
    dimensionBindings: z.record(z.string(), metricBindingSourceSchema),
    queryParameterBindings: z
      .record(z.string(), metricBindingSourceSchema)
      .optional(),
    styles: z.array(styleRuleSchema).optional(),
    ...optionalConditionalStylesSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.expression?.length && !value.terms?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "metric-derived-kpi requires expression or legacy terms",
      });
    }
  })
  .transform((value) => {
    const expression = value.expression?.length
      ? value.expression
      : value.terms
        ? migrateLegacyDerivedTerms(value.terms)
        : [{ type: "metric" as const, metricDefinitionId: "" }];

    return {
      kind: value.kind,
      label: value.label,
      expression,
      groupBindings: value.groupBindings,
      dimensionBindings: value.dimensionBindings,
      ...(value.queryParameterBindings
        ? { queryParameterBindings: value.queryParameterBindings }
        : {}),
      styles: value.styles,
      ...(value.conditionalStyles
        ? { conditionalStyles: value.conditionalStyles }
        : {}),
    };
  })
  .superRefine((value, context) => {
    const grammarError = validateDerivedExpressionGrammar(value.expression);
    if (grammarError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: grammarError,
      });
    }
  });

const fieldComponentBaseSchema = z
  .object({
    primary: dataSourceSchema,
    fallbacks: z.array(dataSourceSchema).optional(),
    label: labelConfigSchema.optional(),
    styles: z.array(styleRuleSchema).optional(),
    conditionalStyles: z.array(conditionalStyleRuleSchema).optional(),
  })
  .strict();

const chartPointSchema = z
  .object({
    x: z.union([z.string(), z.number()]),
    y: z.number().finite(),
    seriesId: z.string().trim().min(1).optional(),
  })
  .strict();

const chartMetricSeriesStepSchema = z
  .object({
    unit: z.enum(["day", "month", "year"]),
    offsetStart: z.number().int(),
    offsetEnd: z.number().int(),
  })
  .strict();

const chartEntityQueryRowFilterSchema = z
  .object({
    whenField: z.string().trim().min(1),
    whenOperator: z.enum(["==", "in"]),
    whenValue: z.union([
      z.string().trim().min(1),
      z.array(z.string().trim().min(1)).min(1),
    ]),
  })
  .strict();

const chartEntityQueryValueTransformSchema = z
  .object({
    whenField: z.string().trim().min(1),
    whenOperator: z.enum(["==", "in"]),
    whenValue: z.union([
      z.string().trim().min(1),
      z.array(z.string().trim().min(1)).min(1),
    ]),
    multiplier: z.number().finite(),
  })
  .strict();

const chartEntityQueryTimeSeriesSchema = z
  .object({
    periodParameter: z.string().trim().min(1),
    bucketCount: z.number().int().min(1).max(366),
    step: chartMetricSeriesStepSchema,
    aggregate: z.enum(["sum", "count"]),
    layout: z.enum(["span", "monthToDateRightAligned"]).optional(),
    rowFilters: z.array(chartEntityQueryRowFilterSchema).optional(),
    valueTransforms: z.array(chartEntityQueryValueTransformSchema).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.layout === "monthToDateRightAligned" &&
      value.bucketCount !== 30
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "monthToDateRightAligned layout requires bucketCount to be 30",
        path: ["bucketCount"],
      });
    }
  });

const chartDataSourceSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("static"),
      points: z.array(chartPointSchema),
    })
    .strict(),
  z
    .object({
      type: z.literal("metricSeries"),
      metricDefinitionId: z.string(),
      dimensionField: z.string().trim().min(1),
      bucketCount: z.number().int().min(1).max(366),
      step: chartMetricSeriesStepSchema,
      groupBindings: z.record(z.string(), metricBindingSourceSchema).optional(),
      dimensionBindings: z
        .record(z.string(), metricBindingSourceSchema)
        .optional(),
      parameterBindings: z
        .record(z.string(), metricBindingSourceSchema)
        .optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("entityQuery"),
      entityQueryDefinitionId: z.string(),
      xFieldPath: z.string().trim().min(1),
      yFieldPath: z.string().trim().min(1),
      seriesFieldPath: z.string().trim().min(1).optional(),
      parameterBindings: z
        .record(z.string(), metricBindingSourceSchema)
        .optional(),
      timeSeries: chartEntityQueryTimeSeriesSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("metricValue"),
      metricDefinitionId: z.string(),
      maxValue: z.number().finite().positive().optional(),
      groupBindings: z.record(z.string(), metricBindingSourceSchema).optional(),
      dimensionBindings: z
        .record(z.string(), metricBindingSourceSchema)
        .optional(),
      parameterBindings: z
        .record(z.string(), metricBindingSourceSchema)
        .optional(),
    })
    .strict(),
]);

const chartSeriesStyleSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().optional(),
    color: z.string().optional(),
    strokeWidth: z.number().finite().min(0.5).max(12).optional(),
    showAreaFill: z.boolean().optional(),
    areaFillColor: z.string().optional(),
    areaFillOpacity: z.number().finite().min(0).max(1).optional(),
  })
  .strict();

const chartLegendSchema = z
  .object({
    visible: z.boolean().optional(),
    position: z.enum(["top", "bottom", "left", "right", "none"]).optional(),
    align: z.enum(["start", "center", "end"]).optional(),
    fontSize: z.number().int().min(8).max(32).optional(),
    fontWeight: z.enum(["normal", "medium", "semibold", "bold"]).optional(),
  })
  .strict();

const chartAxisSchema = z
  .object({
    visible: z.boolean().optional(),
    label: z.string().optional(),
    showTicks: z.boolean().optional(),
  })
  .strict();

const chartGridSchema = z
  .object({
    visible: z.boolean().optional(),
  })
  .strict();

const chartAnimationSchema = z
  .object({
    enabled: z.boolean().optional(),
    durationMs: z.number().int().min(0).max(5000).optional(),
  })
  .strict();

const chartDonutSchema = z
  .object({
    innerRadiusRatio: z.number().finite().min(0).max(0.95).optional(),
    trackColor: z.string().optional(),
    fillColor: z.string().optional(),
    showCenterLabel: z.boolean().optional(),
    strokeWidth: z.number().finite().min(0).max(12).optional(),
  })
  .strict();

export const chartDefinitionRecipeSchema = z
  .object({
    chartType: z.enum(["line", "area", "donut"]),
    displayMode: z.enum(["inline", "overlay"]).optional(),
    dataSource: chartDataSourceSchema,
    series: z.array(chartSeriesStyleSchema).optional(),
    xAxis: chartAxisSchema.optional(),
    yAxis: chartAxisSchema.optional(),
    legend: chartLegendSchema.optional(),
    grid: chartGridSchema.optional(),
    animation: chartAnimationSchema.optional(),
    donut: chartDonutSchema.optional(),
  })
  .strict();

const rowNodeSchema: z.ZodType<unknown> = z.lazy(() => componentRowSchema);

const fieldComponentSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    fieldComponentBaseSchema.extend({ kind: z.literal("text") }).strict(),
    fieldComponentBaseSchema
      .extend({
        kind: z.literal("image"),
        imageSize: z.number().int().min(8).max(1024).optional(),
        displayMode: z.enum(["inline", "overlay"]).optional(),
        objectFit: z.enum(["contain", "cover", "fill"]).optional(),
      })
      .strict(),
    fieldComponentBaseSchema
      .extend({
        kind: z.literal("date"),
        dateDisplayFormat: z
          .enum(["date", "datetime", "time", "daysRemaining"])
          .optional(),
      })
      .strict(),
    fieldComponentBaseSchema
      .extend({
        kind: z.literal("numeric"),
        displayFormat: z.enum(["currency", "plain", "percentage"]).optional(),
        showCurrency: z.boolean().optional(),
        showToneColors: z.boolean().optional(),
      })
      .strict(),
    fieldComponentBaseSchema.extend({ kind: z.literal("badge") }).strict(),
    z
      .object({
        kind: z.literal("chart"),
        chartDefinitionId: z.string().trim().min(1),
        parameterBindings: z
          .record(z.string(), metricBindingSourceSchema)
          .optional(),
        ariaLabel: z.string().optional(),
        styles: z.array(styleRuleSchema).optional(),
        ...optionalConditionalStylesSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("metric-kpi"),
        metricDefinitionId: z.string(),
        groupBindings: z.record(z.string(), metricBindingSourceSchema),
        dimensionBindings: z.record(z.string(), metricBindingSourceSchema),
        parameterBindings: z
          .record(z.string(), metricBindingSourceSchema)
          .optional(),
        queryParameterBindings: z
          .record(z.string(), metricBindingSourceSchema)
          .optional(),
        label: z.string().optional(),
        showToneColors: z.boolean().optional(),
        tonePolarity: z.enum(["normal", "inverted"]).optional(),
        styles: z.array(styleRuleSchema).optional(),
        ...optionalConditionalStylesSchema,
      })
      .strict(),
    metricDerivedKpiSchema,
    z
      .object({
        kind: z.literal("metric-widget"),
        entityName: z.string(),
        widgetId: z.string(),
        label: z.string().optional(),
        styles: z.array(styleRuleSchema).optional(),
        ...optionalConditionalStylesSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("dashboard-section"),
        sectionId: z.string(),
        label: z.string().optional(),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("form-field"),
        fieldPath: z.string().trim().min(1),
        hideLabel: z.boolean().optional(),
        hidden: z.boolean().optional(),
        booleanDisplay: z.enum(["checkbox", "switch"]).optional(),
        switchVariant: z.enum(["ios", "squared"]).optional(),
        switchWidth: z.number().int().min(28).max(120).optional(),
        switchHeight: z.number().int().min(16).max(64).optional(),
        multiline: z.boolean().optional(),
        multilineRows: z.number().int().min(2).max(20).optional(),
        styles: z.array(styleRuleSchema).optional(),
        ...optionalConditionalStylesSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("entity-field-selector"),
        fieldPath: z.string().trim().min(1),
        layout: z.enum(["list", "list-with-logo", "mini-cards"]),
        hidden: z.boolean().optional(),
        enableSearch: z.boolean().optional(),
        cardsPerRow: z.number().int().min(1).max(4).optional(),
        imageFieldPath: z.string().trim().min(1).optional(),
        styles: z.array(styleRuleSchema).optional(),
        ...optionalConditionalStylesSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("form-section"),
        title: z.string().trim().min(1).optional(),
        styles: z.array(styleRuleSchema).optional(),
        ...optionalConditionalStylesSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("icon"),
        iconName: z.string().trim().min(1),
        iconSize: z.number().int().min(12).max(96).optional(),
        label: labelConfigSchema.optional(),
        styles: z.array(styleRuleSchema).optional(),
        ...optionalConditionalStylesSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("user"),
        display: z.enum([
          "name",
          "email",
          "photo",
          "photo-and-name",
          "profile-button",
        ]),
        nameFormat: z.enum(["full", "first"]).optional(),
        imageSize: z.number().int().min(8).max(1024).optional(),
        avatarShape: z.enum(["circle", "rounded", "square"]).optional(),
        profileButtonContent: z.enum(["photo", "full"]).optional(),
        label: labelConfigSchema.optional(),
        styles: z.array(styleRuleSchema).optional(),
        ...optionalConditionalStylesSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("notification-bell"),
        iconName: z.string().trim().min(1).optional(),
        iconSize: z.number().int().min(12).max(96).optional(),
        showBadge: z.boolean().optional(),
        label: labelConfigSchema.optional(),
        styles: z.array(styleRuleSchema).optional(),
        ...optionalConditionalStylesSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("form-actions"),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("wizard-progress"),
        variant: z.enum(["steps", "bar", "stepper"]).optional(),
        stepLabel: z
          .object({
            show: z.boolean().optional(),
            position: z
              .enum(["top", "bottom", "left", "right", "hidden"])
              .optional(),
            bold: z.boolean().optional(),
            thin: z.boolean().optional(),
            italic: z.boolean().optional(),
            underline: z.boolean().optional(),
            color: z.string().trim().min(1).optional(),
            align: z.enum(["left", "center", "right"]).optional(),
            fontSize: z.number().int().min(8).max(48).optional(),
          })
          .strict()
          .optional(),
        barTrackColor: z.string().trim().min(1).optional(),
        barFillColor: z.string().trim().min(1).optional(),
        stepSpacing: z.number().int().min(8).max(96).optional(),
        circleSize: z.number().int().min(20).max(56).optional(),
        labelMaxWidth: z.number().int().min(48).max(320).optional(),
        conditionalStyles: z.array(conditionalStyleRuleSchema).optional(),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("wizard-step-host"),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("wizard-actions"),
        nextLabel: z.string().trim().min(1).optional(),
        backLabel: z.string().trim().min(1).optional(),
        cancelLabel: z.string().trim().min(1).optional(),
        submitCreateLabel: z.string().trim().min(1).optional(),
        submitEditLabel: z.string().trim().min(1).optional(),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("related-records"),
        childEntity: z.string().trim().min(1),
        foreignKeyField: z.string().trim().min(1),
        styles: z.array(styleRuleSchema).optional(),
        ...optionalConditionalStylesSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("page-header"),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("page-toolbar"),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("page-metrics"),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("page-list"),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("view-search"),
        placeholder: z.string().optional(),
        label: labelConfigSchema.optional(),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("view-filters"),
        filters: z
          .array(
            z
              .object({
                entityName: z.string().trim().min(1),
                fieldName: z.string().trim().min(1),
              })
              .strict(),
          )
          .default([]),
        label: labelConfigSchema.optional(),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("view-date-filter"),
        dateFilterGranularity: z.enum(["year", "month", "day"]).optional(),
        dateFilterParam: z.string().trim().min(1).optional(),
        label: labelConfigSchema.optional(),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("container"),
        rows: z.array(rowNodeSchema),
        stackDirection: z.enum(["column", "row"]).optional(),
        styles: z.array(styleRuleSchema).optional(),
        ...optionalConditionalStylesSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("grid"),
        gridTemplateColumns: z.string().trim().min(1),
        gap: z.string().trim().min(1).optional(),
        alignItems: z.enum(["start", "center", "end", "stretch"]).optional(),
        rows: z.array(rowNodeSchema),
        styles: z.array(styleRuleSchema).optional(),
        ...optionalConditionalStylesSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("query-viewer"),
        entityQueryDefinitionId: z.string(),
        parameterBindings: z
          .record(z.string(), metricBindingSourceSchema)
          .optional(),
        rows: z.array(rowNodeSchema),
        emptyStateRows: z.array(rowNodeSchema).optional(),
        stackDirection: z.enum(["column", "row"]).optional(),
        styles: z.array(styleRuleSchema).optional(),
        ...optionalConditionalStylesSchema,
      })
      .strict(),
  ]),
);

export const componentRowSchema: z.ZodType<unknown> = z.lazy(() =>
  z
    .object({
      type: z.literal("component"),
      id: z.string().trim().min(1),
      component: fieldComponentSchema,
      clickAction: componentClickActionSchema.optional(),
      styles: z.array(styleRuleSchema).optional(),
      motion: motionPresetSchema.optional(),
      name: z.string().trim().min(1).optional(),
      displayFrom: responsiveGridBreakpointSchema.optional(),
      displayTo: responsiveGridBreakpointSchema.optional(),
    })
    .strict(),
);

export const columnNodeSchema: z.ZodType<{
  id: string;
  rows: unknown[];
  name?: string;
  stackDirection?: "column" | "row";
  widthPercent?: number;
  styles?: unknown[];
  displayFrom?: "base" | "sm" | "md" | "lg" | "xl";
  displayTo?: "base" | "sm" | "md" | "lg" | "xl";
}> = z.lazy(() =>
  z
    .object({
      id: z.string().trim().min(1),
      rows: z.array(rowNodeSchema),
      name: z.string().trim().min(1).optional(),
      stackDirection: z.enum(["column", "row"]).optional(),
      widthPercent: z.number().int().min(1).max(100).optional(),
      styles: z.array(styleRuleSchema).optional(),
      displayFrom: responsiveGridBreakpointSchema.optional(),
      displayTo: responsiveGridBreakpointSchema.optional(),
    })
    .strict(),
);

const layoutRootNodeSchema = z
  .object({
    type: z.literal("root"),
    id: z.string().trim().min(1),
    columnCount: z.number().int().min(1).max(6),
    columns: z.array(columnNodeSchema).min(1),
    styles: z.array(styleRuleSchema).optional(),
  })
  .strict();

const screenRootNodeSchema = z
  .object({
    type: z.literal("screen-root"),
    id: z.string().trim().min(1),
    gridTemplateColumns: z.string().trim().min(1),
    gap: z.string().trim().min(1).optional(),
    alignItems: z.enum(["start", "center", "end", "stretch"]).optional(),
    rows: z.array(rowNodeSchema),
    styles: z.array(styleRuleSchema).optional(),
  })
  .strict();

const layoutDocumentRootSchema = z.union([
  layoutRootNodeSchema,
  screenRootNodeSchema,
]);

export const uiLayoutDocumentSchema = z
  .object({
    root: layoutDocumentRootSchema,
    showActions: z.boolean().optional(),
    cardsPerRow: z.number().int().min(1).max(4).optional(),
    motion: motionPresetSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.root.type !== "root") {
      return;
    }

    if (value.root.columnCount !== value.root.columns.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "root.columnCount must match columns.length",
        path: ["root", "columnCount"],
      });
    }
  });

export type UiLayoutDocumentInput = z.infer<typeof uiLayoutDocumentSchema>;
