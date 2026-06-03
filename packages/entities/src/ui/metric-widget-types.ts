import {
  styleRuleSchema,
  uiLayoutDocumentSchema,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { z } from "zod";

export const metricBindingSourceSchema = z.discriminatedUnion("type", [
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

export type MetricBindingSource = z.infer<typeof metricBindingSourceSchema>;

export const metricWidgetBindingsSchema = z
  .object({
    groupBindings: z.record(z.string(), metricBindingSourceSchema),
    dimensionBindings: z.record(z.string(), metricBindingSourceSchema),
  })
  .strict();

export type MetricWidgetBindings = z.infer<typeof metricWidgetBindingsSchema>;

export const metricWidgetPlacementSchema = z
  .object({
    column: z.number().int().min(1),
    row: z.number().int().min(1).optional(),
    columnSpan: z.number().int().min(1).optional(),
    rowSpan: z.number().int().min(1).optional(),
    stackDirection: z.enum(["column", "row"]).optional(),
  })
  .strict();

export type MetricWidgetPlacement = z.infer<typeof metricWidgetPlacementSchema>;

export const viewMetricKpiWidgetSchema = z
  .object({
    id: z.string().trim().min(1),
    display: z.literal("kpi"),
    metricDefinitionId: z.string().trim().min(1),
    label: z.string().trim().min(1).optional(),
    groupBindings: z.record(z.string(), metricBindingSourceSchema),
    dimensionBindings: z.record(z.string(), metricBindingSourceSchema),
    layout: uiLayoutDocumentSchema.optional(),
    styles: z.array(styleRuleSchema).optional(),
    placement: metricWidgetPlacementSchema.optional(),
  })
  .strict();

export const viewMetricSeriesBucketSchema = metricWidgetBindingsSchema.extend({
  layout: uiLayoutDocumentSchema.optional(),
});

export const viewMetricSeriesWidgetSchema = z
  .object({
    id: z.string().trim().min(1),
    display: z.literal("series"),
    metricDefinitionId: z.string().trim().min(1),
    label: z.string().trim().min(1).optional(),
    buckets: z.array(viewMetricSeriesBucketSchema).min(1),
    layout: uiLayoutDocumentSchema.optional(),
    styles: z.array(styleRuleSchema).optional(),
    placement: metricWidgetPlacementSchema.optional(),
  })
  .strict();

export const viewMetricWidgetSchema = z.discriminatedUnion("display", [
  viewMetricKpiWidgetSchema,
  viewMetricSeriesWidgetSchema,
]);

type ViewMetricKpiWidgetParsed = z.infer<typeof viewMetricKpiWidgetSchema>;
export type ViewMetricKpiWidget = Omit<ViewMetricKpiWidgetParsed, "layout"> & {
  readonly layout?: UiLayoutDocument;
};

type ViewMetricSeriesBucketParsed = z.infer<
  typeof viewMetricSeriesBucketSchema
>;
export type ViewMetricSeriesBucket = Omit<
  ViewMetricSeriesBucketParsed,
  "layout"
> & {
  readonly layout?: UiLayoutDocument;
};

type ViewMetricSeriesWidgetParsed = z.infer<
  typeof viewMetricSeriesWidgetSchema
>;
export type ViewMetricSeriesWidget = Omit<
  ViewMetricSeriesWidgetParsed,
  "layout" | "buckets"
> & {
  readonly layout?: UiLayoutDocument;
  readonly buckets: readonly ViewMetricSeriesBucket[];
};

export type ViewMetricWidget = ViewMetricKpiWidget | ViewMetricSeriesWidget;
