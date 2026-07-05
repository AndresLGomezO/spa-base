import { validateMetricQueryAgainstDefinition } from "../validate-metric-query.js";
import type { MetricRowQuery } from "../validate-metric-query.js";
import type { MetricDefinitionRecord } from "../types.js";
import {
  computePercentChange,
  readPrimaryNumericValueFromRow,
} from "./read-primary-value.js";
import {
  ComputedMetricParameterError,
  resolveComputedMetricParameters,
} from "./resolve-parameters.js";
import type {
  ComputedMetricComputation,
  ComputedMetricInputRef,
} from "./types.js";
import { isComputedMetricDefinition } from "./types.js";

export class ComputedMetricEvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComputedMetricEvaluationError";
  }
}

export interface ComputedMetricInputResolver {
  readonly resolveMetricDefinition: (
    metricDefinitionId: string,
  ) => Promise<MetricDefinitionRecord | null>;
  readonly readMetricRowValue: (input: {
    readonly definition: MetricDefinitionRecord;
    readonly group: Record<string, unknown>;
    readonly dimensions: Record<string, unknown>;
    readonly userId: string;
  }) => Promise<number | null>;
  readonly readQueryRefValue: (input: {
    readonly queryDefinitionId: string;
    readonly parameterValues: Readonly<
      Record<string, string | number | boolean>
    >;
    readonly aggregationField?: string;
    readonly aggregationOperation?: "SUM" | "COUNT" | "AVG";
    readonly userId: string;
  }) => Promise<number | null>;
}

function buildSliceFromParameterMap(
  definition: MetricDefinitionRecord,
  parameterMap: Readonly<Record<string, string>>,
  resolvedParameters: Readonly<Record<string, string | number | boolean>>,
): MetricRowQuery {
  const group: Record<string, string | number | boolean> = {};
  const dimensions: Record<string, string | number | boolean> = {};

  for (const [field, parameterName] of Object.entries(parameterMap)) {
    const value = resolvedParameters[parameterName];
    if (value === undefined) {
      throw new ComputedMetricEvaluationError(
        `Missing parameter "${parameterName}" for field "${field}".`,
      );
    }

    if (definition.groupBy.includes(field)) {
      group[field] = value;
    } else if (definition.dimensions.includes(field)) {
      dimensions[field] = value;
    } else {
      throw new ComputedMetricEvaluationError(
        `Field "${field}" is not declared on metric "${definition.name}".`,
      );
    }
  }

  return { group, dimensions };
}

async function resolveInputRefValue(
  resolver: ComputedMetricInputResolver,
  inputRef: ComputedMetricInputRef,
  resolvedParameters: Readonly<Record<string, string | number | boolean>>,
  userId: string,
): Promise<number | null> {
  if (inputRef.type === "metricRef") {
    const definition = await resolver.resolveMetricDefinition(
      inputRef.metricDefinitionId,
    );
    if (!definition) {
      throw new ComputedMetricEvaluationError(
        `Metric "${inputRef.metricDefinitionId}" not found.`,
      );
    }

    if (isComputedMetricDefinition(definition)) {
      const nestedParameters: Record<string, string | number | boolean> = {};
      for (const [field, parameterName] of Object.entries(
        inputRef.parameterMap,
      )) {
        const value = resolvedParameters[parameterName];
        if (value === undefined) {
          throw new ComputedMetricEvaluationError(
            `Missing parameter "${parameterName}" for computed metric "${definition.name}".`,
          );
        }
        nestedParameters[field] = value;
      }

      const nested = await evaluateComputedMetric({
        definition,
        providedParameters: nestedParameters,
        userId,
        resolver,
      });
      return readPrimaryNumericValueFromRow(definition, nested.values);
    }

    const slice = buildSliceFromParameterMap(
      definition,
      inputRef.parameterMap,
      resolvedParameters,
    );
    const normalized = validateMetricQueryAgainstDefinition(definition, slice);
    return resolver.readMetricRowValue({
      definition,
      group: normalized.group,
      dimensions: normalized.dimensions,
      userId,
    });
  }

  const queryParameterValues: Record<string, string | number | boolean> = {};
  for (const [queryParameterName, metricParameterName] of Object.entries(
    inputRef.parameterMap,
  )) {
    const value = resolvedParameters[metricParameterName];
    if (value === undefined) {
      throw new ComputedMetricEvaluationError(
        `Missing parameter "${metricParameterName}" for query parameter "${queryParameterName}".`,
      );
    }
    queryParameterValues[queryParameterName] = value;
  }

  return resolver.readQueryRefValue({
    queryDefinitionId: inputRef.queryDefinitionId,
    parameterValues: queryParameterValues,
    aggregationField: inputRef.aggregationField,
    aggregationOperation: inputRef.aggregationOperation,
    userId,
  });
}

function evaluateExpressionTokens(
  tokens: ComputedMetricComputation & { type: "expression" },
  inputValues: Readonly<Record<string, number | null>>,
): number | null {
  const stack: number[] = [];

  for (const token of tokens.tokens) {
    if (token.type === "literal") {
      stack.push(token.value);
      continue;
    }

    if (token.type === "input") {
      const value = inputValues[token.name];
      if (value === null || value === undefined || !Number.isFinite(value)) {
        return null;
      }
      stack.push(value);
      continue;
    }

    const right = stack.pop();
    const left = stack.pop();
    if (left === undefined || right === undefined) {
      return null;
    }

    switch (token.op) {
      case "+":
        stack.push(left + right);
        break;
      case "-":
        stack.push(left - right);
        break;
      case "*":
        stack.push(left * right);
        break;
      case "/":
        if (right === 0) {
          return null;
        }
        stack.push(left / right);
        break;
      default:
        return null;
    }
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0]!)) {
    return null;
  }

  return stack[0]!;
}

async function evaluateComputation(
  resolver: ComputedMetricInputResolver,
  computation: ComputedMetricComputation,
  resolvedParameters: Readonly<Record<string, string | number | boolean>>,
  userId: string,
): Promise<number | null> {
  switch (computation.type) {
    case "percentChange": {
      const current = await resolveInputRefValue(
        resolver,
        computation.current,
        resolvedParameters,
        userId,
      );
      const baseline = await resolveInputRefValue(
        resolver,
        computation.baseline,
        resolvedParameters,
        userId,
      );
      if (current === null) {
        return null;
      }
      return computePercentChange(current, baseline);
    }
    case "difference": {
      const current = await resolveInputRefValue(
        resolver,
        computation.current,
        resolvedParameters,
        userId,
      );
      const baseline = await resolveInputRefValue(
        resolver,
        computation.baseline,
        resolvedParameters,
        userId,
      );
      if (current === null || baseline === null) {
        return null;
      }
      return current - baseline;
    }
    case "ratio": {
      const numerator = await resolveInputRefValue(
        resolver,
        computation.numerator,
        resolvedParameters,
        userId,
      );
      const denominator = await resolveInputRefValue(
        resolver,
        computation.denominator,
        resolvedParameters,
        userId,
      );
      if (numerator === null || denominator === null || denominator === 0) {
        return null;
      }
      return numerator / denominator;
    }
    case "expression": {
      const inputValues: Record<string, number | null> = {};
      for (const [name, inputRef] of Object.entries(computation.inputs)) {
        inputValues[name] = await resolveInputRefValue(
          resolver,
          inputRef,
          resolvedParameters,
          userId,
        );
      }
      return evaluateExpressionTokens(computation, inputValues);
    }
    default:
      return null;
  }
}

export async function evaluateComputedMetric(input: {
  readonly definition: MetricDefinitionRecord;
  readonly providedParameters: Readonly<Record<string, unknown>>;
  readonly userId: string;
  readonly resolver: ComputedMetricInputResolver;
}): Promise<{ readonly values: Record<string, number> }> {
  if (!isComputedMetricDefinition(input.definition)) {
    throw new ComputedMetricEvaluationError(
      `Metric "${input.definition.name}" is not a computed metric.`,
    );
  }

  if (!input.definition.computation || !input.definition.parameters) {
    throw new ComputedMetricEvaluationError(
      `Metric "${input.definition.name}" is missing computation configuration.`,
    );
  }

  let resolvedParameters: Record<string, string | number | boolean>;
  try {
    resolvedParameters = resolveComputedMetricParameters({
      parameters: input.definition.parameters,
      provided: input.providedParameters,
    });
  } catch (error) {
    if (error instanceof ComputedMetricParameterError) {
      throw new ComputedMetricEvaluationError(error.message);
    }
    throw error;
  }

  const value = await evaluateComputation(
    input.resolver,
    input.definition.computation,
    resolvedParameters,
    input.userId,
  );

  if (value === null || !Number.isFinite(value)) {
    return { values: {} };
  }

  return { values: { primary: value } };
}

export function readComputedMetricPrimaryValue(
  definition: MetricDefinitionRecord,
  values: Record<string, number> | undefined,
): number | null {
  return readPrimaryNumericValueFromRow(definition, values);
}
