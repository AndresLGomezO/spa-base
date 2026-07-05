import {
  uiLayoutDocumentSchema,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { z } from "zod";

export const relativePeriodAnchorSchema = z.enum([
  "dashboardDateFilter",
  "listFilter",
  "routeParam",
  "now",
]);

export type RelativePeriodAnchor = z.infer<typeof relativePeriodAnchorSchema>;

export const relativePeriodUnitSchema = z.enum(["day", "month", "year"]);

export type RelativePeriodUnit = z.infer<typeof relativePeriodUnitSchema>;

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
  z
    .object({
      type: z.literal("dashboardDateFilter"),
    })
    .strict(),
  z
    .object({
      type: z.literal("relativePeriod"),
      field: z.string().trim().min(1),
      anchor: relativePeriodAnchorSchema,
      offset: z.number().int(),
      unit: relativePeriodUnitSchema,
      anchorField: z.string().trim().min(1).optional(),
      anchorParam: z.string().trim().min(1).optional(),
    })
    .strict(),
]);

export type MetricBindingSource = z.infer<typeof metricBindingSourceSchema>;

/** Alias for metric and query parameter bindings. */
export type FilterBindingSource = MetricBindingSource;

export const filterBindingSourceSchema = metricBindingSourceSchema;

export const metricWidgetBindingsSchema = z
  .object({
    groupBindings: z.record(z.string(), metricBindingSourceSchema),
    dimensionBindings: z.record(z.string(), metricBindingSourceSchema),
  })
  .strict();

export type MetricWidgetBindings = z.infer<typeof metricWidgetBindingsSchema>;

export interface MetricWidgetDefinition {
  readonly id: string;
  readonly name: string;
  readonly layout: UiLayoutDocument;
}

export const metricWidgetDefinitionSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    layout: uiLayoutDocumentSchema,
  })
  .strict();

export const metricWidgetsSchema = z.array(metricWidgetDefinitionSchema);
