import { z } from "zod";

import { chartDefinitionRecipeSchema } from "@repo/ui-builder-core";

import { CHART_DEFINITION_PERMISSIONS } from "./permissions.js";

export { CHART_DEFINITION_PERMISSIONS };

export const CHART_DEFINITIONS_COLLECTION = "__chart_definitions" as const;

export const CHART_DEFINITION_STATUSES = ["ACTIVE", "PAUSED"] as const;
export type ChartDefinitionStatus = (typeof CHART_DEFINITION_STATUSES)[number];

export const chartDefinitionBodySchema = chartDefinitionRecipeSchema
  .extend({
    name: z.string().trim().min(1),
    description: z.string().trim().optional(),
    status: z.enum(CHART_DEFINITION_STATUSES).default("ACTIVE"),
  })
  .strict();

export const chartDefinitionRecordSchema = chartDefinitionBodySchema
  .extend({
    id: z.string().trim().min(1),
    tenantId: z.string().trim().min(1),
    chartId: z.string().trim().min(1),
    version: z.number().int().positive().default(1),
    createdAt: z.string().trim().min(1),
    updatedAt: z.string().trim().min(1),
  })
  .strict();

export type ChartDefinitionRecord = z.infer<typeof chartDefinitionRecordSchema>;

export const createChartDefinitionInputSchema = chartDefinitionBodySchema
  .extend({
    status: z.enum(CHART_DEFINITION_STATUSES).default("ACTIVE"),
  })
  .strict();

export type CreateChartDefinitionInput = z.infer<
  typeof createChartDefinitionInputSchema
>;

export const patchChartDefinitionInputSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    chartType: z.enum(["line", "area", "donut"]).optional(),
    displayMode: z.enum(["inline", "overlay"]).optional(),
    dataSource: chartDefinitionRecipeSchema.shape.dataSource.optional(),
    series: chartDefinitionRecipeSchema.shape.series.optional(),
    xAxis: chartDefinitionRecipeSchema.shape.xAxis.optional(),
    yAxis: chartDefinitionRecipeSchema.shape.yAxis.optional(),
    legend: chartDefinitionRecipeSchema.shape.legend.optional(),
    grid: chartDefinitionRecipeSchema.shape.grid.optional(),
    animation: chartDefinitionRecipeSchema.shape.animation.optional(),
    donut: chartDefinitionRecipeSchema.shape.donut.optional(),
    status: z.enum(CHART_DEFINITION_STATUSES).optional(),
  })
  .strict();

export type PatchChartDefinitionInput = z.infer<
  typeof patchChartDefinitionInputSchema
>;
