import { z } from "zod";

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
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "textAlign",
  "alignItems",
  "justifyContent",
  "alignSelf",
  "flex",
  "minWidth",
  "maxWidth",
  "borderRadius",
  "borderWidth",
  "borderColor",
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

const styleRuleSchema = z
  .object({
    property: stylePropertySchema,
    value: z.union([z.string(), themeTokenSchema]),
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
    background: themeTokenSchema.optional(),
    textColor: themeTokenSchema.optional(),
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

const fieldComponentBaseSchema = z
  .object({
    primary: dataSourceSchema,
    fallbacks: z.array(dataSourceSchema).optional(),
    label: labelConfigSchema.optional(),
    styles: z.array(styleRuleSchema).optional(),
    conditionalStyles: z.array(conditionalStyleRuleSchema).optional(),
  })
  .strict();

const fieldComponentSchema = z.discriminatedUnion("kind", [
  fieldComponentBaseSchema.extend({ kind: z.literal("text") }).strict(),
  fieldComponentBaseSchema
    .extend({
      kind: z.literal("image"),
      imageSize: z.number().int().min(24).max(96).optional(),
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
      metricDefinitionId: z.string().trim().min(1),
      groupBindings: z.record(z.string(), metricBindingSourceSchema),
      dimensionBindings: z.record(z.string(), metricBindingSourceSchema),
      label: z.string().optional(),
      styles: z.array(styleRuleSchema).optional(),
    })
    .strict(),
]);

const componentRowSchema = z
  .object({
    type: z.literal("component"),
    id: z.string().trim().min(1),
    component: fieldComponentSchema,
    styles: z.array(styleRuleSchema).optional(),
  })
  .strict();

const columnNodeSchema: z.ZodType<{
  id: string;
  rows: unknown[];
  stackDirection?: "column" | "row";
  styles?: unknown[];
}> = z.lazy(() =>
  z
    .object({
      id: z.string().trim().min(1),
      rows: z.array(rowNodeSchema),
      stackDirection: z.enum(["column", "row"]).optional(),
      styles: z.array(styleRuleSchema).optional(),
    })
    .strict(),
);

const nestedLayoutRowSchema: z.ZodType<{
  type: "nested-layout";
  id: string;
  columnCount: number;
  columns: unknown[];
  styles?: unknown[];
}> = z.lazy(() =>
  z
    .object({
      type: z.literal("nested-layout"),
      id: z.string().trim().min(1),
      columnCount: z.number().int().min(1).max(6),
      columns: z.array(columnNodeSchema).min(1),
      styles: z.array(styleRuleSchema).optional(),
    })
    .strict(),
);

const rowNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([componentRowSchema, nestedLayoutRowSchema]),
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
