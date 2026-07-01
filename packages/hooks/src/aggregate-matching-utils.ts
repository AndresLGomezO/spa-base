import type { DataHookAggregateOperator } from "./data-hook-definition.js";
import { evaluateExpression, type ExpressionValue } from "./expression.js";
import { HookExecutionError } from "./types.js";
import type { HookEntityRecord } from "./types.js";

function readMatchFieldValue(
  match: HookEntityRecord,
  field: string,
): ExpressionValue {
  return evaluateExpression(
    { kind: "field", source: "current", path: field },
    { current: match as Record<string, unknown>, now: new Date() },
  );
}

function requireNumericValues(
  values: readonly ExpressionValue[],
  field: string,
  op: DataHookAggregateOperator,
): readonly number[] {
  const numbers: number[] = [];
  for (const value of values) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new HookExecutionError(
        `aggregateMatching ${op} requires numeric "${field}" values; got ${String(value)}.`,
      );
    }
    numbers.push(value);
  }
  return numbers;
}

function comparableValues(
  values: readonly ExpressionValue[],
): readonly (string | number)[] {
  const output: (string | number)[] = [];
  for (const value of values) {
    if (value === null) {
      continue;
    }
    if (typeof value === "string" || typeof value === "number") {
      output.push(value);
      continue;
    }
    throw new HookExecutionError(
      `aggregateMatching min/max requires string or number field values; got ${String(value)}.`,
    );
  }
  return output;
}

export function computeAggregateMatching(
  op: DataHookAggregateOperator,
  field: string | undefined,
  matches: readonly HookEntityRecord[],
): ExpressionValue {
  if (op === "count") {
    return matches.length;
  }

  if (!field || field.trim().length === 0) {
    throw new HookExecutionError(
      `aggregateMatching ${op} requires a non-empty field name.`,
    );
  }

  const values = matches.map((match) => readMatchFieldValue(match, field));

  if (values.length === 0) {
    return op === "sum" ? 0 : null;
  }

  switch (op) {
    case "sum": {
      const numbers = requireNumericValues(values, field, op);
      return numbers.reduce((total, value) => total + value, 0);
    }
    case "avg": {
      const numbers = requireNumericValues(values, field, op);
      return (
        numbers.reduce((total, value) => total + value, 0) / numbers.length
      );
    }
    case "min": {
      const comparable = comparableValues(values);
      if (comparable.length === 0) {
        return null;
      }
      return comparable.reduce((min, value) => (value < min ? value : min));
    }
    case "max": {
      const comparable = comparableValues(values);
      if (comparable.length === 0) {
        return null;
      }
      return comparable.reduce((max, value) => (value > max ? value : max));
    }
    default: {
      const exhaustive: never = op;
      throw new HookExecutionError(
        `Unsupported aggregate operator: ${String(exhaustive)}`,
      );
    }
  }
}
