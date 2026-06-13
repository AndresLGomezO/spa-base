import {
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
