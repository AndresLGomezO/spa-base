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
  "alignItems",
  "justifyContent",
  "alignSelf",
  "flex",
  "minWidth",
  "maxWidth",
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

export const styleRuleSchema = z
  .object({
    property: stylePropertySchema,
    value: z.union([z.string(), themeTokenSchema, shadowTokenSchema]),
  })
  .strict();

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

const metricBindingSourceSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("static"),
      value: z.union([z.string(), z.number(), z.boolean()]),
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
    styles: z.array(styleRuleSchema).optional(),
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
      styles: value.styles,
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

const rowNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([componentRowSchema, nestedLayoutRowSchema]),
);

const fieldComponentSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    fieldComponentBaseSchema.extend({ kind: z.literal("text") }).strict(),
    fieldComponentBaseSchema
      .extend({
        kind: z.literal("image"),
        imageSize: z.number().int().min(8).max(1024).optional(),
      })
      .strict(),
    fieldComponentBaseSchema
      .extend({
        kind: z.literal("date"),
        dateDisplayFormat: z.enum(["date", "datetime", "time"]).optional(),
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
        kind: z.literal("metric-kpi"),
        metricDefinitionId: z.string(),
        groupBindings: z.record(z.string(), metricBindingSourceSchema),
        dimensionBindings: z.record(z.string(), metricBindingSourceSchema),
        label: z.string().optional(),
        styles: z.array(styleRuleSchema).optional(),
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
        booleanDisplay: z.enum(["checkbox", "switch"]).optional(),
        switchVariant: z.enum(["ios", "squared"]).optional(),
        switchWidth: z.number().int().min(28).max(120).optional(),
        switchHeight: z.number().int().min(16).max(64).optional(),
        multiline: z.boolean().optional(),
        multilineRows: z.number().int().min(2).max(20).optional(),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("entity-field-selector"),
        fieldPath: z.string().trim().min(1),
        layout: z.enum(["list", "list-with-logo", "mini-cards"]),
        enableSearch: z.boolean().optional(),
        cardsPerRow: z.number().int().min(1).max(4).optional(),
        imageFieldPath: z.string().trim().min(1).optional(),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("form-section"),
        title: z.string().trim().min(1).optional(),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("icon"),
        iconName: z.string().trim().min(1),
        iconSize: z.number().int().min(12).max(96).optional(),
        label: labelConfigSchema.optional(),
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("user"),
        display: z.enum(["name", "email", "photo", "photo-and-name"]),
        nameFormat: z.enum(["full", "first"]).optional(),
        imageSize: z.number().int().min(8).max(1024).optional(),
        label: labelConfigSchema.optional(),
        styles: z.array(styleRuleSchema).optional(),
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
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("view-filter"),
        enableSearch: z.boolean().optional(),
        enableFilters: z.boolean().optional(),
        searchPlaceholder: z.string().optional(),
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
        styles: z.array(styleRuleSchema).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("container"),
        rows: z.array(rowNodeSchema),
        stackDirection: z.enum(["column", "row"]).optional(),
        styles: z.array(styleRuleSchema).optional(),
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
      styles: z.array(styleRuleSchema).optional(),
      motion: motionPresetSchema.optional(),
      displayFrom: responsiveGridBreakpointSchema.optional(),
      displayTo: responsiveGridBreakpointSchema.optional(),
    })
    .strict(),
);

export const columnNodeSchema: z.ZodType<{
  id: string;
  rows: unknown[];
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
      stackDirection: z.enum(["column", "row"]).optional(),
      widthPercent: z.number().int().min(1).max(100).optional(),
      styles: z.array(styleRuleSchema).optional(),
      displayFrom: responsiveGridBreakpointSchema.optional(),
      displayTo: responsiveGridBreakpointSchema.optional(),
    })
    .strict(),
);

export const nestedLayoutRowSchema: z.ZodType<{
  type: "nested-layout";
  id: string;
  columnCount: number;
  columns: unknown[];
  styles?: unknown[];
  displayFrom?: "base" | "sm" | "md" | "lg" | "xl";
  displayTo?: "base" | "sm" | "md" | "lg" | "xl";
}> = z.lazy(() =>
  z
    .object({
      type: z.literal("nested-layout"),
      id: z.string().trim().min(1),
      columnCount: z.number().int().min(1).max(6),
      columns: z.array(columnNodeSchema).min(1),
      styles: z.array(styleRuleSchema).optional(),
      displayFrom: responsiveGridBreakpointSchema.optional(),
      displayTo: responsiveGridBreakpointSchema.optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      if (value.columnCount !== value.columns.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "columnCount must match columns.length",
          path: ["columnCount"],
        });
      }
    }),
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

export const uiLayoutDocumentSchema = z
  .object({
    root: layoutRootNodeSchema,
    showActions: z.boolean().optional(),
    cardsPerRow: z.number().int().min(1).max(4).optional(),
    motion: motionPresetSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.root.columnCount !== value.root.columns.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "root.columnCount must match columns.length",
        path: ["root", "columnCount"],
      });
    }
  });

export type UiLayoutDocumentInput = z.infer<typeof uiLayoutDocumentSchema>;
