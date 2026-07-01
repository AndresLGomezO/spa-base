import type { ExpressionFunction } from "./expression.js";
import { EXPRESSION_FUNCTIONS } from "./expression.js";

export type ExpressionFunctionArgKind = "expression" | "dateUnit";

export interface ExpressionFunctionArgSpec {
  readonly kind: ExpressionFunctionArgKind;
  readonly label?: string;
  readonly optional?: boolean;
}

export interface ExpressionFunctionSpec {
  readonly minArgs: number;
  readonly maxArgs: number;
  readonly args: readonly ExpressionFunctionArgSpec[];
  readonly variadic?: boolean;
}

function fixedArgs(
  count: number,
  options?: {
    readonly lastKind?: ExpressionFunctionArgKind;
    readonly lastOptional?: boolean;
  },
): ExpressionFunctionSpec {
  const args: ExpressionFunctionArgSpec[] = [];
  for (let index = 0; index < count; index += 1) {
    const isLast = index === count - 1;
    args.push({
      kind: isLast ? (options?.lastKind ?? "expression") : "expression",
      ...(isLast && options?.lastOptional ? { optional: true } : {}),
    });
  }
  return {
    minArgs: count - (options?.lastOptional ? 1 : 0),
    maxArgs: count,
    args,
  };
}

export const EXPRESSION_FUNCTION_SPECS: Record<
  ExpressionFunction,
  ExpressionFunctionSpec
> = {
  now: { minArgs: 0, maxArgs: 0, args: [] },
  dateAdd: fixedArgs(3, { lastKind: "dateUnit" }),
  dateDiff: fixedArgs(3, { lastKind: "dateUnit" }),
  year: fixedArgs(1),
  month: fixedArgs(1),
  day: fixedArgs(1),
  abs: fixedArgs(1),
  round: fixedArgs(1),
  floor: fixedArgs(1),
  ceil: fixedArgs(1),
  min: {
    minArgs: 1,
    maxArgs: 8,
    args: [{ kind: "expression" }],
    variadic: true,
  },
  max: {
    minArgs: 1,
    maxArgs: 8,
    args: [{ kind: "expression" }],
    variadic: true,
  },
  coalesce: {
    minArgs: 1,
    maxArgs: 8,
    args: [{ kind: "expression" }],
    variadic: true,
  },
  concat: {
    minArgs: 1,
    maxArgs: 8,
    args: [{ kind: "expression" }],
    variadic: true,
  },
  toNumber: fixedArgs(1),
  toText: fixedArgs(1),
  dateParse: fixedArgs(1),
  isEmpty: fixedArgs(1),
  if: fixedArgs(3),
  length: fixedArgs(1),
  substring: fixedArgs(3, { lastOptional: true }),
  trim: fixedArgs(1),
  upper: fixedArgs(1),
  lower: fixedArgs(1),
  startsWith: fixedArgs(2),
  endsWith: fixedArgs(2),
  includes: fixedArgs(2),
};

export function getExpressionFunctionSpec(
  fn: ExpressionFunction,
): ExpressionFunctionSpec {
  return EXPRESSION_FUNCTION_SPECS[fn];
}

export function listExpressionFunctionSpecs(): readonly ExpressionFunction[] {
  return EXPRESSION_FUNCTIONS;
}
