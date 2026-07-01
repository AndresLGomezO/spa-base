import { z } from "zod";

/**
 * Expression engine for Data Hooks.
 *
 * Expressions are stored as a JSON AST (not parsed from text) so the UI can
 * build them safely and the runtime can evaluate them deterministically with
 * no I/O. Values flow as the primitive union {@link ExpressionValue}; dates are
 * represented as ISO-8601 strings (consistent with the rest of the codebase,
 * which uses native `Date`/ISO and no date library).
 */

export const EXPRESSION_BINARY_OPERATORS = [
  "+",
  "-",
  "*",
  "/",
  "%",
  "==",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "&&",
  "||",
] as const;

export type ExpressionBinaryOperator =
  (typeof EXPRESSION_BINARY_OPERATORS)[number];

export const EXPRESSION_UNARY_OPERATORS = ["-", "!"] as const;

export type ExpressionUnaryOperator =
  (typeof EXPRESSION_UNARY_OPERATORS)[number];

export const EXPRESSION_FUNCTIONS = [
  "now",
  "dateAdd",
  "dateDiff",
  "year",
  "month",
  "day",
  "abs",
  "round",
  "floor",
  "ceil",
  "min",
  "max",
  "coalesce",
  "concat",
  "toNumber",
  "toText",
  "dateParse",
  "isEmpty",
  "if",
  "length",
  "substring",
  "trim",
  "upper",
  "lower",
  "startsWith",
  "endsWith",
  "includes",
] as const;

export type ExpressionFunction = (typeof EXPRESSION_FUNCTIONS)[number];

export const DATE_UNITS = [
  "MILLISECOND",
  "SECOND",
  "MINUTE",
  "HOUR",
  "DAY",
  "WEEK",
  "MONTH",
  "YEAR",
] as const;

export type DateUnit = (typeof DATE_UNITS)[number];

export const EXPRESSION_VARIABLES = ["now", "loopIndex", "userId"] as const;

export type ExpressionVariable = (typeof EXPRESSION_VARIABLES)[number];

export type ExpressionValue = string | number | boolean | null;

export type ExpressionNode =
  | { readonly kind: "literal"; readonly value: ExpressionValue }
  | {
      readonly kind: "field";
      readonly source: "current" | "previous";
      readonly path: string;
    }
  | { readonly kind: "var"; readonly name: ExpressionVariable }
  | {
      readonly kind: "unary";
      readonly op: ExpressionUnaryOperator;
      readonly operand: ExpressionNode;
    }
  | {
      readonly kind: "binary";
      readonly op: ExpressionBinaryOperator;
      readonly left: ExpressionNode;
      readonly right: ExpressionNode;
    }
  | {
      readonly kind: "call";
      readonly fn: ExpressionFunction;
      readonly args: readonly ExpressionNode[];
    };

function enumValues<T extends string>(values: readonly T[]): [T, ...T[]] {
  return values as unknown as [T, ...T[]];
}

const literalValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const expressionNodeSchema: z.ZodType<ExpressionNode> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("literal"), value: literalValueSchema }),
    z.object({
      kind: z.literal("field"),
      source: z.enum(["current", "previous"]),
      path: z.string().trim().min(1),
    }),
    z.object({
      kind: z.literal("var"),
      name: z.enum(enumValues(EXPRESSION_VARIABLES)),
    }),
    z.object({
      kind: z.literal("unary"),
      op: z.enum(enumValues(EXPRESSION_UNARY_OPERATORS)),
      operand: expressionNodeSchema,
    }),
    z.object({
      kind: z.literal("binary"),
      op: z.enum(enumValues(EXPRESSION_BINARY_OPERATORS)),
      left: expressionNodeSchema,
      right: expressionNodeSchema,
    }),
    z.object({
      kind: z.literal("call"),
      fn: z.enum(enumValues(EXPRESSION_FUNCTIONS)),
      args: z.array(expressionNodeSchema).max(16),
    }),
  ]),
) as z.ZodType<ExpressionNode>;

export interface ExpressionScope {
  readonly current: Record<string, unknown>;
  readonly previous?: Record<string, unknown>;
  readonly now: Date;
  readonly userId?: string;
  readonly loopIndex?: number;
}

export class ExpressionEvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpressionEvaluationError";
  }
}

const UNIT_MS: Readonly<Record<Exclude<DateUnit, "MONTH" | "YEAR">, number>> = {
  MILLISECOND: 1,
  SECOND: 1_000,
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
  WEEK: 604_800_000,
};

function readPath(
  source: Record<string, unknown> | undefined,
  path: string,
): ExpressionValue {
  if (!source) {
    return null;
  }
  let current: unknown = source;
  for (const segment of path.split(".")) {
    if (current == null || typeof current !== "object") {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return toExpressionValue(current);
}

function toExpressionValue(value: unknown): ExpressionValue {
  if (
    value == null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value ?? null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
}

function coerceNumber(value: ExpressionValue): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  throw new ExpressionEvaluationError(
    `Cannot coerce value to number: ${JSON.stringify(value)}`,
  );
}

function coerceDate(value: ExpressionValue): Date {
  if (typeof value === "number") {
    return new Date(value);
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  throw new ExpressionEvaluationError(
    `Cannot coerce value to date: ${JSON.stringify(value)}`,
  );
}

function isEmptyValue(value: ExpressionValue): boolean {
  return value == null || value === "";
}

function looseEquals(left: ExpressionValue, right: ExpressionValue): boolean {
  if (left === right) {
    return true;
  }
  if (typeof left === "number" || typeof right === "number") {
    try {
      return coerceNumber(left) === coerceNumber(right);
    } catch {
      return false;
    }
  }
  return false;
}

function compareOrdered(left: ExpressionValue, right: ExpressionValue): number {
  if (typeof left === "number" || typeof right === "number") {
    return coerceNumber(left) - coerceNumber(right);
  }
  const leftText = String(left ?? "");
  const rightText = String(right ?? "");
  if (leftText < rightText) return -1;
  if (leftText > rightText) return 1;
  return 0;
}

function truthy(value: ExpressionValue): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.length > 0;
  return value != null;
}

function addToDate(date: Date, amount: number, unit: DateUnit): Date {
  const next = new Date(date.getTime());
  if (unit === "MONTH") {
    next.setUTCMonth(next.getUTCMonth() + amount);
    return next;
  }
  if (unit === "YEAR") {
    next.setUTCFullYear(next.getUTCFullYear() + amount);
    return next;
  }
  return new Date(date.getTime() + amount * UNIT_MS[unit]);
}

function diffDates(from: Date, to: Date, unit: DateUnit): number {
  if (unit === "YEAR") {
    return diffDates(from, to, "MONTH") / 12;
  }
  if (unit === "MONTH") {
    let months =
      (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
      (to.getUTCMonth() - from.getUTCMonth());
    if (to.getUTCDate() < from.getUTCDate()) {
      months -= 1;
    }
    return months;
  }
  return (to.getTime() - from.getTime()) / UNIT_MS[unit];
}

function assertDateUnit(value: ExpressionValue): DateUnit {
  if (
    typeof value === "string" &&
    (DATE_UNITS as readonly string[]).includes(value)
  ) {
    return value as DateUnit;
  }
  throw new ExpressionEvaluationError(
    `Invalid date unit: ${JSON.stringify(value)}. Expected one of ${DATE_UNITS.join(", ")}.`,
  );
}

function evaluateCall(
  fn: ExpressionFunction,
  args: readonly ExpressionValue[],
  scope: ExpressionScope,
): ExpressionValue {
  switch (fn) {
    case "now":
      return scope.now.toISOString();
    case "dateAdd": {
      const [date, amount, unit] = args;
      return addToDate(
        coerceDate(date ?? null),
        coerceNumber(amount ?? null),
        assertDateUnit(unit ?? null),
      ).toISOString();
    }
    case "dateDiff": {
      const [from, to, unit] = args;
      return diffDates(
        coerceDate(from ?? null),
        coerceDate(to ?? null),
        assertDateUnit(unit ?? null),
      );
    }
    case "year":
      return coerceDate(args[0] ?? null).getUTCFullYear();
    case "month":
      return coerceDate(args[0] ?? null).getUTCMonth() + 1;
    case "day":
      return coerceDate(args[0] ?? null).getUTCDate();
    case "abs":
      return Math.abs(coerceNumber(args[0] ?? null));
    case "round":
      return Math.round(coerceNumber(args[0] ?? null));
    case "floor":
      return Math.floor(coerceNumber(args[0] ?? null));
    case "ceil":
      return Math.ceil(coerceNumber(args[0] ?? null));
    case "min":
      return Math.min(...args.map((value) => coerceNumber(value)));
    case "max":
      return Math.max(...args.map((value) => coerceNumber(value)));
    case "coalesce":
      return args.find((value) => value != null) ?? null;
    case "concat":
      return args.map((value) => (value == null ? "" : String(value))).join("");
    case "toNumber":
      return coerceNumber(args[0] ?? null);
    case "toText":
      return args[0] == null ? "" : String(args[0]);
    case "dateParse":
      return coerceDate(args[0] ?? null).toISOString();
    case "isEmpty":
      return isEmptyValue(args[0] ?? null);
    case "if": {
      const [condition, thenValue, elseValue] = args;
      return truthy(condition ?? null)
        ? (thenValue ?? null)
        : (elseValue ?? null);
    }
    case "length":
      return args[0] == null ? 0 : String(args[0]).length;
    case "substring": {
      const text = args[0] == null ? "" : String(args[0]);
      const start = Math.trunc(coerceNumber(args[1] ?? null));
      if (args[2] == null) {
        return text.substring(start);
      }
      return text.substring(start, Math.trunc(coerceNumber(args[2])));
    }
    case "trim":
      return args[0] == null ? "" : String(args[0]).trim();
    case "upper":
      return args[0] == null ? "" : String(args[0]).toUpperCase();
    case "lower":
      return args[0] == null ? "" : String(args[0]).toLowerCase();
    case "startsWith":
      return String(args[0] ?? "").startsWith(String(args[1] ?? ""));
    case "endsWith":
      return String(args[0] ?? "").endsWith(String(args[1] ?? ""));
    case "includes":
      return String(args[0] ?? "").includes(String(args[1] ?? ""));
    default: {
      const exhaustive: never = fn;
      throw new ExpressionEvaluationError(
        `Unsupported function: ${String(exhaustive)}`,
      );
    }
  }
}

function evaluateBinary(
  op: ExpressionBinaryOperator,
  left: ExpressionValue,
  right: ExpressionValue,
): ExpressionValue {
  switch (op) {
    case "+":
      if (typeof left === "string" || typeof right === "string") {
        return `${left ?? ""}${right ?? ""}`;
      }
      return coerceNumber(left) + coerceNumber(right);
    case "-":
      return coerceNumber(left) - coerceNumber(right);
    case "*":
      return coerceNumber(left) * coerceNumber(right);
    case "/": {
      const divisor = coerceNumber(right);
      if (divisor === 0) {
        throw new ExpressionEvaluationError("Division by zero.");
      }
      return coerceNumber(left) / divisor;
    }
    case "%": {
      const divisor = coerceNumber(right);
      if (divisor === 0) {
        throw new ExpressionEvaluationError("Modulo by zero.");
      }
      return coerceNumber(left) % divisor;
    }
    case "==":
      return looseEquals(left, right);
    case "!=":
      return !looseEquals(left, right);
    case ">":
      return compareOrdered(left, right) > 0;
    case "<":
      return compareOrdered(left, right) < 0;
    case ">=":
      return compareOrdered(left, right) >= 0;
    case "<=":
      return compareOrdered(left, right) <= 0;
    case "&&":
      return truthy(left) && truthy(right);
    case "||":
      return truthy(left) ? left : right;
    default: {
      const exhaustive: never = op;
      throw new ExpressionEvaluationError(
        `Unsupported operator: ${String(exhaustive)}`,
      );
    }
  }
}

export function evaluateExpression(
  node: ExpressionNode,
  scope: ExpressionScope,
): ExpressionValue {
  switch (node.kind) {
    case "literal":
      return node.value;
    case "field":
      return readPath(
        node.source === "previous" ? scope.previous : scope.current,
        node.path,
      );
    case "var":
      if (node.name === "now") {
        return scope.now.toISOString();
      }
      if (node.name === "userId") {
        return scope.userId ?? null;
      }
      return scope.loopIndex ?? null;
    case "unary": {
      const operand = evaluateExpression(node.operand, scope);
      return node.op === "-" ? -coerceNumber(operand) : !truthy(operand);
    }
    case "binary": {
      const left = evaluateExpression(node.left, scope);
      if (node.op === "&&" && !truthy(left)) {
        return false;
      }
      if (node.op === "||" && truthy(left)) {
        return left;
      }
      const right = evaluateExpression(node.right, scope);
      return evaluateBinary(node.op, left, right);
    }
    case "call": {
      const args = node.args.map((arg) => evaluateExpression(arg, scope));
      return evaluateCall(node.fn, args, scope);
    }
    default: {
      const exhaustive: never = node;
      throw new ExpressionEvaluationError(
        `Unsupported expression node: ${JSON.stringify(exhaustive)}`,
      );
    }
  }
}

export {
  isEmptyValue as isEmptyExpressionValue,
  looseEquals as expressionValuesEqual,
};
