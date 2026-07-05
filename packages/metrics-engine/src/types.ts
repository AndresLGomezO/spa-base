import { z } from "zod";

import { validateFieldsDependency } from "./aggregation-helpers.js";
import {
  computedMetricComputationSchema,
  METRIC_COMPUTATION_MODES,
  metricDefinitionParameterSchema,
} from "./computed-metric/types.js";

export {
  METRIC_DEFINITION_PERMISSIONS,
  METRIC_PERMISSIONS,
  METRIC_VALUE_PERMISSIONS,
} from "./permissions.js";

export const METRICS_DEFINITIONS_COLLECTION = "__metrics_definitions" as const;
export const METRICS_VALUES_ROOT = "metrics" as const;
export const METRIC_CONTRIBUTIONS_ROOT = "__metric_contributions" as const;
export const BACKFILL_JOBS_COLLECTION = "__backfill_jobs" as const;

export const METRIC_AGGREGATION_OPERATIONS = ["SUM", "COUNT", "AVG"] as const;
export const METRIC_DEFINITION_STATUSES = ["ACTIVE", "PAUSED"] as const;
export const METRIC_DATE_GRANULARITIES = ["day", "month", "year"] as const;
export const METRIC_VALUE_DISPLAY_FORMATS = [
  "number",
  "currency",
  "percent",
] as const;

export type MetricDateGranularity = (typeof METRIC_DATE_GRANULARITIES)[number];
export type MetricComputationMode = (typeof METRIC_COMPUTATION_MODES)[number];

export {
  METRIC_COMPUTATION_MODES,
  metricDefinitionParameterSchema,
  computedMetricComputationSchema,
  metricEvaluateRequestSchema,
  isComputedMetricDefinition,
} from "./computed-metric/types.js";
export type {
  MetricDefinitionParameter,
  ComputedMetricComputation,
  ComputedMetricInputRef,
  MetricEvaluateRequest,
} from "./computed-metric/types.js";

export type MetricValueDisplayFormat =
  (typeof METRIC_VALUE_DISPLAY_FORMATS)[number];

export type MetricAggregationOperation =
  (typeof METRIC_AGGREGATION_OPERATIONS)[number];
export type MetricDefinitionStatus =
  (typeof METRIC_DEFINITION_STATUSES)[number];

export const metricFilterSchema = z.object({
  field: z.string().trim().min(1),
  op: z.enum(["eq", "in"]),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string().trim().min(1)),
  ]),
});

export type MetricFilter = z.infer<typeof metricFilterSchema>;

const sumAvgAggregationSpecSchema = z.object({
  operation: z.enum(["SUM", "AVG"]),
  field: z.string().trim().min(1),
});

const countAggregationSpecSchema = z.object({
  operation: z.literal("COUNT"),
  field: z.string().trim().min(1).optional(),
});

export const metricAggregationSpecSchema = z.union([
  sumAvgAggregationSpecSchema,
  countAggregationSpecSchema,
]);

export type MetricAggregationSpec = z.infer<typeof metricAggregationSpecSchema>;

const fieldsDependencyRefine = {
  aggregations: z.array(metricAggregationSpecSchema).min(1),
  fieldsDependency: z.array(z.string().trim().min(1)).default([]),
};

export const metricTargetSchema = z.object({
  collection: z.string().trim().min(1),
  granularity: z.string().trim().min(1).default("dynamic"),
});

const metricDefinitionBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  computationMode: z.enum(METRIC_COMPUTATION_MODES).default("aggregated"),
  sourceModel: z.string().trim().min(1),
  sourceQueryDefinitionId: z.string().trim().min(1).optional(),
  filters: z.array(metricFilterSchema).default([]),
  groupBy: z.array(z.string().trim().min(1)).default([]),
  dimensions: z.array(z.string().trim().min(1)).default([]),
  dateFieldGranularity: z
    .record(z.string().trim().min(1), z.enum(METRIC_DATE_GRANULARITIES))
    .default({}),
  valueDisplayFormat: z.enum(METRIC_VALUE_DISPLAY_FORMATS).default("number"),
  parameters: z.array(metricDefinitionParameterSchema).default([]),
  computation: computedMetricComputationSchema.optional(),
  aggregations: fieldsDependencyRefine.aggregations,
  target: metricTargetSchema,
  version: z.number().int().positive(),
  schemaVersionDependency: z.number().int().nonnegative(),
  fieldsDependency: fieldsDependencyRefine.fieldsDependency,
  status: z.enum(METRIC_DEFINITION_STATUSES),
});

function refineMetricDefinitionBody(
  value: {
    readonly computationMode: MetricComputationMode;
    readonly computation?: z.infer<typeof computedMetricComputationSchema>;
    readonly parameters: readonly z.infer<
      typeof metricDefinitionParameterSchema
    >[];
    readonly aggregations: z.infer<typeof metricAggregationSpecSchema>[];
    readonly fieldsDependency: readonly string[];
    readonly groupBy: readonly string[];
    readonly dimensions: readonly string[];
    readonly dateFieldGranularity: Readonly<
      Record<string, MetricDateGranularity>
    >;
  },
  context: z.RefinementCtx,
): void {
  if (value.computationMode === "computed") {
    if (!value.computation) {
      context.addIssue({
        code: "custom",
        message: "computed metrics require computation.",
        path: ["computation"],
      });
    }

    const parameterNames = new Set(value.parameters.map((entry) => entry.name));
    for (const parameter of value.parameters) {
      if (
        parameter.deriveFrom &&
        !parameterNames.has(parameter.deriveFrom.parameter)
      ) {
        context.addIssue({
          code: "custom",
          message: `deriveFrom parameter "${parameter.deriveFrom.parameter}" is not declared.`,
          path: ["parameters"],
        });
      }
    }

    return;
  }

  if (!validateFieldsDependency(value.aggregations, value.fieldsDependency)) {
    context.addIssue({
      code: "custom",
      message:
        "fieldsDependency must include at least one field unless the metric is document COUNT only.",
      path: ["fieldsDependency"],
    });
  }

  const allowedKeyFields = new Set([...value.groupBy, ...value.dimensions]);
  for (const field of Object.keys(value.dateFieldGranularity)) {
    if (!allowedKeyFields.has(field)) {
      context.addIssue({
        code: "custom",
        message: `dateFieldGranularity includes unknown field "${field}".`,
        path: ["dateFieldGranularity", field],
      });
    }
  }
}

export const metricDefinitionRecordSchema = metricDefinitionBodySchema
  .extend({
    id: z.string().trim().min(1),
    tenantId: z.string().trim().min(1),
    metricId: z.string().trim().min(1),
    createdAt: z.string().trim().min(1),
    updatedAt: z.string().trim().min(1),
  })
  .superRefine((value, context) => refineMetricDefinitionBody(value, context));

export type MetricDefinitionRecord = z.infer<
  typeof metricDefinitionRecordSchema
>;

export const createMetricDefinitionInputSchema = metricDefinitionBodySchema
  .omit({ target: true })
  .extend({
    target: metricTargetSchema.optional(),
    version: z.number().int().positive().default(1),
    status: z.enum(METRIC_DEFINITION_STATUSES).default("ACTIVE"),
    aggregations: z.array(metricAggregationSpecSchema).min(1).optional(),
  })
  .superRefine((value, context) => {
    const aggregations =
      value.aggregations ??
      (value.computationMode === "computed"
        ? [{ operation: "COUNT" as const }]
        : undefined);

    if (!aggregations || aggregations.length === 0) {
      context.addIssue({
        code: "custom",
        message: "aggregations are required for aggregated metrics.",
        path: ["aggregations"],
      });
      return;
    }

    refineMetricDefinitionBody(
      {
        computationMode: value.computationMode,
        computation: value.computation,
        parameters: value.parameters,
        aggregations,
        fieldsDependency: value.fieldsDependency,
        groupBy: value.groupBy,
        dimensions: value.dimensions,
        dateFieldGranularity: value.dateFieldGranularity,
      },
      context,
    );
  });

export type CreateMetricDefinitionInput = z.infer<
  typeof createMetricDefinitionInputSchema
>;

export const patchMetricDefinitionInputSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    filters: z.array(metricFilterSchema).optional(),
    groupBy: z.array(z.string().trim().min(1)).optional(),
    dimensions: z.array(z.string().trim().min(1)).optional(),
    dateFieldGranularity: z
      .record(z.string().trim().min(1), z.enum(METRIC_DATE_GRANULARITIES))
      .optional(),
    parameters: z.array(metricDefinitionParameterSchema).optional(),
    computation: computedMetricComputationSchema.optional(),
    computationMode: z.enum(METRIC_COMPUTATION_MODES).optional(),
    valueDisplayFormat: z.enum(METRIC_VALUE_DISPLAY_FORMATS).optional(),
    aggregations: z.array(metricAggregationSpecSchema).min(1).optional(),
    version: z.number().int().positive().optional(),
    schemaVersionDependency: z.number().int().nonnegative().optional(),
    fieldsDependency: z.array(z.string().trim().min(1)).optional(),
    status: z.enum(METRIC_DEFINITION_STATUSES).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export type PatchMetricDefinitionInput = z.infer<
  typeof patchMetricDefinitionInputSchema
>;

export const metricValueRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  metricName: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  group: z.record(z.string(), z.unknown()).default({}),
  dimensions: z.record(z.string(), z.unknown()).default({}),
  values: z.record(z.string(), z.number()),
  updatedAt: z.string().trim().min(1),
});

export type MetricValueRecord = z.infer<typeof metricValueRecordSchema>;
