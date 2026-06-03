import { z } from "zod";

import type { LayoutAlign } from "./card-layout-types.js";
import type { LayoutSpacing } from "./layout-spacing.js";
import { layoutSpacingSchemaShape } from "./layout-spacing.js";

const cardLayoutAlignSchema = z.enum(["start", "center", "end", "stretch"]);

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

export const viewMetricKpiWidgetSchema = z
  .object({
    id: z.string().trim().min(1),
    display: z.literal("kpi"),
    metricDefinitionId: z.string().trim().min(1),
    label: z.string().trim().min(1).optional(),
    groupBindings: z.record(z.string(), metricBindingSourceSchema),
    dimensionBindings: z.record(z.string(), metricBindingSourceSchema),
  })
  .strict();

export const viewMetricSeriesBucketSchema = metricWidgetBindingsSchema;

export const viewMetricSeriesWidgetSchema = z
  .object({
    id: z.string().trim().min(1),
    display: z.literal("series"),
    metricDefinitionId: z.string().trim().min(1),
    label: z.string().trim().min(1).optional(),
    buckets: z.array(viewMetricSeriesBucketSchema).min(1),
  })
  .strict();

export const viewMetricWidgetSchema = z.discriminatedUnion("display", [
  viewMetricKpiWidgetSchema,
  viewMetricSeriesWidgetSchema,
]);

export type ViewMetricKpiWidget = z.infer<typeof viewMetricKpiWidgetSchema>;
export type ViewMetricSeriesWidget = z.infer<
  typeof viewMetricSeriesWidgetSchema
>;
export type ViewMetricWidget = z.infer<typeof viewMetricWidgetSchema>;

export function isCardMetricKpiBinding(binding: {
  readonly component: string;
}): binding is CardMetricKpiSlotBinding {
  return binding.component === "metric-kpi";
}

export interface CardMetricKpiSlotBinding extends LayoutSpacing {
  readonly component: "metric-kpi";
  readonly metricDefinitionId: string;
  readonly groupBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly dimensionBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly label?: string;
  readonly className?: string;
  readonly align?: LayoutAlign;
  readonly textSize?: number;
  readonly textBold?: boolean;
}

export const cardMetricKpiSlotBindingSchema = z
  .object({
    component: z.literal("metric-kpi"),
    metricDefinitionId: z.string().trim().min(1),
    groupBindings: z.record(z.string(), metricBindingSourceSchema),
    dimensionBindings: z.record(z.string(), metricBindingSourceSchema),
    label: z.string().optional(),
    className: z.string().optional(),
    align: cardLayoutAlignSchema.optional(),
    textSize: z.number().int().min(10).max(32).optional(),
    textBold: z.boolean().optional(),
    ...layoutSpacingSchemaShape,
  })
  .strict();
