import type {
  CreateMetricDefinitionInput,
  MetricDateGranularity,
  MetricFilter,
  MetricValueDisplayFormat,
} from "@repo/metrics-engine";

const DEFAULT_VERSION = 1;
const DEFAULT_SCHEMA_VERSION = 1;

export const DEBT_CONTRACT_TYPES = [
  "LOAN",
  "CREDIT_CARD",
  "MORTGAGE",
  "CAR_LOAN",
  "PERSONAL_LOAN",
] as const;

export const INVESTMENT_CONTRACT_TYPES = [
  "INVESTMENT",
  "STOCK",
  "ETF",
  "BOND",
  "CRYPTO",
  "SAVINGS",
  "FIXED_TERM",
  "REAL_ESTATE",
  "BUSINESS",
] as const;

interface MetricBaseInput {
  readonly name: string;
  readonly description: string;
  readonly sourceModel: string;
  readonly fieldsDependency: readonly string[];
  readonly groupBy?: readonly string[];
  readonly dimensions?: readonly string[];
  readonly filters?: readonly MetricFilter[];
  readonly dateFieldGranularity?: Readonly<
    Record<string, MetricDateGranularity>
  >;
  readonly valueDisplayFormat?: MetricValueDisplayFormat;
}

function buildMetricInput(
  input: MetricBaseInput & {
    readonly aggregations: CreateMetricDefinitionInput["aggregations"];
  },
): CreateMetricDefinitionInput {
  return {
    name: input.name,
    description: input.description,
    sourceModel: input.sourceModel,
    filters: [...(input.filters ?? [])],
    groupBy: [...(input.groupBy ?? [])],
    dimensions: [...(input.dimensions ?? [])],
    dateFieldGranularity: { ...(input.dateFieldGranularity ?? {}) },
    valueDisplayFormat: input.valueDisplayFormat ?? "number",
    aggregations: [...input.aggregations],
    version: DEFAULT_VERSION,
    schemaVersionDependency: DEFAULT_SCHEMA_VERSION,
    fieldsDependency: [...input.fieldsDependency],
    status: "ACTIVE",
  };
}

export function sumMetric(
  input: MetricBaseInput & { readonly field: string },
): CreateMetricDefinitionInput {
  return buildMetricInput({
    ...input,
    aggregations: [{ operation: "SUM", field: input.field }],
  });
}

export function avgMetric(
  input: MetricBaseInput & { readonly field: string },
): CreateMetricDefinitionInput {
  return buildMetricInput({
    ...input,
    aggregations: [{ operation: "AVG", field: input.field }],
  });
}

export function countMetric(
  input: MetricBaseInput,
): CreateMetricDefinitionInput {
  return buildMetricInput({
    ...input,
    aggregations: [{ operation: "COUNT" }],
  });
}
