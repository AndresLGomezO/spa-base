import { z } from "zod";

export const METRIC_COMPUTATION_MODES = ["aggregated", "computed"] as const;
export type MetricComputationMode = (typeof METRIC_COMPUTATION_MODES)[number];

export const METRIC_PARAMETER_VALUE_TYPES = [
  "dateBucket",
  "string",
  "number",
] as const;
export type MetricParameterValueType =
  (typeof METRIC_PARAMETER_VALUE_TYPES)[number];

export const metricParameterShiftSchema = z.object({
  unit: z.enum(["day", "month", "year"]),
  offset: z.number().int(),
});

export type MetricParameterShift = z.infer<typeof metricParameterShiftSchema>;

export const metricParameterDeriveFromSchema = z.object({
  parameter: z.string().trim().min(1),
  shift: metricParameterShiftSchema,
});

export type MetricParameterDeriveFrom = z.infer<
  typeof metricParameterDeriveFromSchema
>;

export const metricDefinitionParameterSchema = z.object({
  name: z.string().trim().min(1),
  valueType: z.enum(METRIC_PARAMETER_VALUE_TYPES),
  granularity: z.enum(["day", "month", "year"]).optional(),
  deriveFrom: metricParameterDeriveFromSchema.optional(),
});

export type MetricDefinitionParameter = z.infer<
  typeof metricDefinitionParameterSchema
>;

export const computedMetricInputRefSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("metricRef"),
    metricDefinitionId: z.string().trim().min(1),
    parameterMap: z.record(z.string().trim().min(1), z.string().trim().min(1)),
  }),
  z.object({
    type: z.literal("queryRef"),
    queryDefinitionId: z.string().trim().min(1),
    parameterMap: z.record(z.string().trim().min(1), z.string().trim().min(1)),
    aggregationField: z.string().trim().min(1).optional(),
    aggregationOperation: z.enum(["SUM", "COUNT", "AVG"]).optional(),
  }),
]);

export type ComputedMetricInputRef = z.infer<
  typeof computedMetricInputRefSchema
>;

const expressionTokenSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("input"),
    name: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("operator"),
    op: z.enum(["+", "-", "*", "/"]),
  }),
  z.object({
    type: z.literal("literal"),
    value: z.number(),
  }),
]);

export const computedMetricComputationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("percentChange"),
    current: computedMetricInputRefSchema,
    baseline: computedMetricInputRefSchema,
  }),
  z.object({
    type: z.literal("difference"),
    current: computedMetricInputRefSchema,
    baseline: computedMetricInputRefSchema,
  }),
  z.object({
    type: z.literal("ratio"),
    numerator: computedMetricInputRefSchema,
    denominator: computedMetricInputRefSchema,
  }),
  z.object({
    type: z.literal("expression"),
    inputs: z.record(z.string().trim().min(1), computedMetricInputRefSchema),
    tokens: z.array(expressionTokenSchema).min(1),
  }),
]);

export type ComputedMetricComputation = z.infer<
  typeof computedMetricComputationSchema
>;

export const metricEvaluateRequestSchema = z.object({
  parameters: z.record(z.string(), z.unknown()).default({}),
});

export type MetricEvaluateRequest = z.infer<typeof metricEvaluateRequestSchema>;

export function isComputedMetricDefinition(input: {
  readonly computationMode?: MetricComputationMode;
}): boolean {
  return input.computationMode === "computed";
}
