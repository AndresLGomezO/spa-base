import { z } from "zod";

import { sha256Hex } from "./sha256.js";

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
  "dateOnly",
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
  "pow",
  "ln",
  "normalizeMatchText",
  /** @deprecated Use `normalizeMatchText`. Kept for seeded tenant hook compatibility. */
  "normalizeMerchantText",
  "arrayOf",
  "sha256",
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

export const EXPRESSION_VARIABLES = [
  "now",
  "loopIndex",
  "loopState",
  "userId",
] as const;

export type ExpressionVariable = (typeof EXPRESSION_VARIABLES)[number];

export type ExpressionScalar = string | number | boolean | null;

export type ExpressionLiteralValue =
  | ExpressionScalar
  | readonly ExpressionScalar[];

/** Runtime expression result; may be a flat array when evaluating array literals. */
export type ExpressionValue = ExpressionLiteralValue;

/** Max items per array literal on a `literal` expression node. */
export const MAX_ARRAY_LITERAL_ITEMS = 32;

/** Max arguments per expression `call` node (e.g. long `concat` JSON builders). */
export const MAX_CALL_ARGS = 32;

/** Max case rows per `switch` expression node. */
export const MAX_SWITCH_CASES = 32;

export type ExpressionSwitchCase = {
  readonly when: ExpressionNode;
  readonly then: ExpressionNode;
};

export type ExpressionFieldNode =
  | {
      readonly kind: "field";
      readonly source: "current" | "previous";
      readonly path: string;
    }
  | {
      readonly kind: "field";
      readonly source: "loaded";
      readonly alias: string;
      readonly path: string;
    }
  | {
      readonly kind: "field";
      readonly source: "aggregate";
      readonly alias: string;
    };

/** Max nested formula calls per evaluation stack. */
export const MAX_FORMULA_DEPTH = 16;

export interface FormulaDefinitionForEval {
  readonly name: string;
  readonly inputs: readonly {
    readonly name: string;
    readonly required?: boolean;
  }[];
  readonly body: ExpressionNode;
}

export interface FormulaResolver {
  resolve(name: string, tenantId: string): FormulaDefinitionForEval | undefined;
}

export type ExpressionNode =
  | { readonly kind: "literal"; readonly value: ExpressionLiteralValue }
  | ExpressionFieldNode
  | { readonly kind: "var"; readonly name: ExpressionVariable }
  | { readonly kind: "input"; readonly name: string }
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
    }
  | {
      readonly kind: "switch";
      readonly input: ExpressionNode;
      readonly cases: readonly ExpressionSwitchCase[];
      readonly default: ExpressionNode;
    }
  | {
      readonly kind: "formula";
      readonly name: string;
      readonly inputs: Readonly<Record<string, ExpressionNode>>;
    };

function enumValues<T extends string>(values: readonly T[]): [T, ...T[]] {
  return values as unknown as [T, ...T[]];
}

const expressionScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const literalValueSchema = z.union([
  expressionScalarSchema,
  z.array(expressionScalarSchema).min(1).max(MAX_ARRAY_LITERAL_ITEMS),
]);

const expressionFieldNodeSchema: z.ZodType<ExpressionFieldNode> = z.union([
  z.object({
    kind: z.literal("field"),
    source: z.enum(["current", "previous"]),
    path: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal("field"),
    source: z.literal("loaded"),
    alias: z.string().trim().min(1),
    path: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal("field"),
    source: z.literal("aggregate"),
    alias: z.string().trim().min(1),
  }),
]);

const expressionSwitchCaseSchema: z.ZodType<ExpressionSwitchCase> = z.object({
  when: z.lazy(() => expressionNodeSchema),
  then: z.lazy(() => expressionNodeSchema),
});

export const expressionNodeSchema: z.ZodType<ExpressionNode> = z.lazy(() =>
  z.union([
    expressionFieldNodeSchema,
    z.object({ kind: z.literal("literal"), value: literalValueSchema }),
    z.object({
      kind: z.literal("var"),
      name: z.enum(enumValues(EXPRESSION_VARIABLES)),
    }),
    z.object({
      kind: z.literal("input"),
      name: z.string().trim().min(1),
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
      args: z.array(expressionNodeSchema).max(MAX_CALL_ARGS),
    }),
    z.object({
      kind: z.literal("switch"),
      input: expressionNodeSchema,
      cases: z.array(expressionSwitchCaseSchema).min(1).max(MAX_SWITCH_CASES),
      default: expressionNodeSchema,
    }),
    z.object({
      kind: z.literal("formula"),
      name: z.string().trim().min(1),
      inputs: z.record(z.string().trim().min(1), expressionNodeSchema),
    }),
  ]),
) as z.ZodType<ExpressionNode>;

export interface ExpressionScope {
  readonly current: Record<string, unknown>;
  readonly previous?: Record<string, unknown>;
  readonly loaded?: Readonly<
    Record<string, Record<string, unknown> | null | undefined>
  >;
  readonly aggregates?: Readonly<Record<string, ExpressionValue>>;
  readonly now: Date;
  readonly userId?: string;
  readonly loopIndex?: number;
  readonly loopState?: number;
  /** Bound formula input values when evaluating a formula body. */
  readonly inputs?: Readonly<Record<string, ExpressionValue>>;
  /** Active formula names on the evaluation stack (cycle guard). */
  readonly formulaStack?: ReadonlySet<string>;
  /** Resolves tenant and platform formulas by name. */
  readonly formulaResolver?: FormulaResolver;
  readonly tenantId?: string;
  /** Per-run memo for invariant formula evaluations (e.g. createRecords loops). */
  readonly formulaResultCache?: Map<string, ExpressionValue>;
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
  source: Record<string, unknown> | null | undefined,
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
  if (Array.isArray(value)) {
    throw new ExpressionEvaluationError("Cannot coerce array to number.");
  }
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
  if (Array.isArray(value)) {
    throw new ExpressionEvaluationError("Cannot coerce array to date.");
  }
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
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return value == null || value === "";
}

function isDateLikeString(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 8) {
    return false;
  }
  const parsed = new Date(trimmed);
  return !Number.isNaN(parsed.getTime());
}

function utcCalendarDayKey(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function looseEquals(left: ExpressionValue, right: ExpressionValue): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return false;
  }
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
  if (typeof left === "string" && typeof right === "string") {
    if (isDateLikeString(left) && isDateLikeString(right)) {
      try {
        return (
          utcCalendarDayKey(coerceDate(left)) ===
          utcCalendarDayKey(coerceDate(right))
        );
      } catch {
        return false;
      }
    }
  }
  return false;
}

function compareOrdered(left: ExpressionValue, right: ExpressionValue): number {
  if (Array.isArray(left) || Array.isArray(right)) {
    throw new ExpressionEvaluationError(
      "Cannot compare array values with ordered operators.",
    );
  }
  if (typeof left === "number" || typeof right === "number") {
    return coerceNumber(left) - coerceNumber(right);
  }
  const leftText = String(left ?? "");
  const rightText = String(right ?? "");
  // Date-like values compare by UTC calendar day so date-only dueDates align with
  // extracted datetimes (e.g. 2026-07-01 >= 2026-07-01T16:17:00).
  if (isDateLikeString(leftText) && isDateLikeString(rightText)) {
    try {
      const leftDay = utcCalendarDayKey(coerceDate(leftText));
      const rightDay = utcCalendarDayKey(coerceDate(rightText));
      if (leftDay < rightDay) return -1;
      if (leftDay > rightDay) return 1;
      return 0;
    } catch {
      // Fall through to lexicographic compare.
    }
  }
  if (leftText < rightText) return -1;
  if (leftText > rightText) return 1;
  return 0;
}

function truthy(value: ExpressionValue): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
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
  if (Array.isArray(value)) {
    throw new ExpressionEvaluationError(
      `Invalid date unit: ${JSON.stringify(value)}. Expected one of ${DATE_UNITS.join(", ")}.`,
    );
  }
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
    case "dateOnly":
      return utcCalendarDayKey(coerceDate(args[0] ?? null));
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
    case "pow":
      return Math.pow(
        coerceNumber(args[0] ?? null),
        coerceNumber(args[1] ?? null),
      );
    case "ln":
      return Math.log(coerceNumber(args[0] ?? null));
    case "normalizeMatchText":
    case "normalizeMerchantText":
      return normalizeMatchText(args[0] ?? null);
    case "arrayOf": {
      const items: ExpressionScalar[] = [];
      for (const value of args) {
        if (Array.isArray(value)) {
          for (const entry of value) {
            items.push(entry);
          }
        } else if (
          value === null ||
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          items.push(value);
        }
      }
      return items;
    }
    case "sha256": {
      const text = args[0] == null ? "" : String(args[0]);
      return sha256Hex(text);
    }
    default: {
      const exhaustive: never = fn;
      throw new ExpressionEvaluationError(
        `Unsupported function: ${String(exhaustive)}`,
      );
    }
  }
}

/**
 * Stabilize free-text for alias matching: uppercase, strip digits and long
 * hex-like tokens, collapse punctuation to spaces.
 */
export function normalizeMatchText(value: ExpressionValue): string {
  if (value == null) {
    return "";
  }
  let text = String(value).toUpperCase();
  // Drop long hex / opaque ids (8+ hex chars).
  text = text.replace(/\b[0-9A-F]{8,}\b/g, " ");
  // Drop digit runs (order numbers, opaque ids).
  text = text.replace(/\d+/g, " ");
  // Non-letters → space (keep letters only for token stability).
  text = text.replace(/[^A-Z]+/g, " ");
  return text.replace(/\s+/g, " ").trim();
}

/**
 * @deprecated Use {@link normalizeMatchText}. Alias retained so existing
 * tenant hook JSON keeps evaluating until catalogs are re-seeded.
 */
export const normalizeMerchantText = normalizeMatchText;

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

function evaluateCallNode(
  node: Extract<ExpressionNode, { kind: "call" }>,
  scope: ExpressionScope,
): ExpressionValue {
  if (node.fn === "coalesce") {
    for (const arg of node.args) {
      const value = evaluateExpression(arg, scope);
      if (value != null) {
        return value;
      }
    }
    return null;
  }

  if (node.fn === "if") {
    const condition = evaluateExpression(node.args[0]!, scope);
    const thenNode = node.args[1];
    const elseNode = node.args[2];
    if (truthy(condition)) {
      return thenNode != null ? evaluateExpression(thenNode, scope) : null;
    }
    return elseNode != null ? evaluateExpression(elseNode, scope) : null;
  }

  const args = node.args.map((arg) => evaluateExpression(arg, scope));
  return evaluateCall(node.fn, args, scope);
}

const loopDependentFormulaBodies = new WeakMap<
  FormulaDefinitionForEval,
  boolean
>();
const loopDependentFormulaNames = new Set<string>();

function formulaBodyDependsOnLoopVars(
  body: ExpressionNode,
  resolver?: FormulaResolver,
  tenantId?: string,
  stack: ReadonlySet<string> = new Set(),
): boolean {
  let depends = false;
  walkExpressionNodes(body, (current) => {
    if (depends) {
      return;
    }
    if (
      current.kind === "var" &&
      (current.name === "loopIndex" || current.name === "loopState")
    ) {
      depends = true;
      return;
    }
    if (current.kind === "formula" && resolver && tenantId) {
      if (loopDependentFormulaNames.has(current.name)) {
        depends = true;
        return;
      }
      if (stack.has(current.name)) {
        return;
      }
      const nested = resolver.resolve(current.name, tenantId);
      if (
        nested &&
        formulaDependsOnLoopVars(
          nested,
          resolver,
          tenantId,
          new Set([...stack, current.name]),
        )
      ) {
        depends = true;
      }
    }
  });
  return depends;
}

function formulaDependsOnLoopVars(
  definition: FormulaDefinitionForEval,
  resolver: FormulaResolver,
  tenantId: string,
  stack: ReadonlySet<string> = new Set(),
): boolean {
  const cached = loopDependentFormulaBodies.get(definition);
  if (cached !== undefined) {
    if (cached) {
      loopDependentFormulaNames.add(definition.name);
    }
    return cached;
  }
  if (stack.has(definition.name)) {
    return false;
  }

  const depends = formulaBodyDependsOnLoopVars(
    definition.body,
    resolver,
    tenantId,
    new Set([...stack, definition.name]),
  );
  loopDependentFormulaBodies.set(definition, depends);
  if (depends) {
    loopDependentFormulaNames.add(definition.name);
  }
  return depends;
}

function isLoopDependentFormula(
  definition: FormulaDefinitionForEval,
  resolver: FormulaResolver,
  tenantId: string,
): boolean {
  return formulaDependsOnLoopVars(definition, resolver, tenantId);
}

function stableSerializeExpressionValue(value: ExpressionValue): string {
  if (value == null) {
    return "null";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

function buildFormulaCacheKey(
  name: string,
  inputValues: Readonly<Record<string, ExpressionValue>>,
): string {
  const inputEntries = Object.entries(inputValues).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const serializedInputs = inputEntries
    .map(
      ([inputName, value]) =>
        `${inputName}:${stableSerializeExpressionValue(value)}`,
    )
    .join(",");
  return `${name}|${serializedInputs}`;
}

function evaluateFormulaNode(
  node: Extract<ExpressionNode, { kind: "formula" }>,
  scope: ExpressionScope,
): ExpressionValue {
  if (!scope.formulaResolver) {
    throw new ExpressionEvaluationError(
      `Formula "${node.name}" requires a formula resolver.`,
    );
  }
  if (!scope.tenantId) {
    throw new ExpressionEvaluationError(
      `Formula "${node.name}" requires tenantId in expression scope.`,
    );
  }

  const stack = scope.formulaStack ?? new Set<string>();
  if (stack.has(node.name)) {
    throw new ExpressionEvaluationError(
      `Circular formula reference detected: ${node.name}.`,
    );
  }
  if (stack.size >= MAX_FORMULA_DEPTH) {
    throw new ExpressionEvaluationError(
      `Formula call depth exceeds the maximum of ${MAX_FORMULA_DEPTH}.`,
    );
  }

  const inputValues: Record<string, ExpressionValue> = {};
  for (const [inputName, inputNode] of Object.entries(node.inputs)) {
    inputValues[inputName] = evaluateExpression(inputNode, scope);
  }

  const cache = scope.formulaResultCache;
  const cacheKey =
    cache && !loopDependentFormulaNames.has(node.name)
      ? buildFormulaCacheKey(node.name, inputValues)
      : undefined;
  if (cacheKey && cache?.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const definition = scope.formulaResolver.resolve(node.name, scope.tenantId);
  if (!definition) {
    throw new ExpressionEvaluationError(`Formula "${node.name}" not found.`);
  }

  for (const inputSpec of definition.inputs) {
    if (inputSpec.required === false) {
      continue;
    }
    if (inputValues[inputSpec.name] == null) {
      throw new ExpressionEvaluationError(
        `Formula "${node.name}" missing required input "${inputSpec.name}".`,
      );
    }
  }

  const formulaScope: ExpressionScope = {
    ...scope,
    inputs: inputValues,
    formulaStack: new Set([...stack, node.name]),
  };

  const result = evaluateExpression(definition.body, formulaScope);
  if (
    cacheKey &&
    cache &&
    !isLoopDependentFormula(definition, scope.formulaResolver, scope.tenantId)
  ) {
    cache.set(cacheKey, result);
  }
  return result;
}

export function walkExpressionNodes(
  node: ExpressionNode,
  visit: (node: ExpressionNode) => void,
): void {
  visit(node);
  if (node.kind === "unary") {
    walkExpressionNodes(node.operand, visit);
    return;
  }
  if (node.kind === "binary") {
    walkExpressionNodes(node.left, visit);
    walkExpressionNodes(node.right, visit);
    return;
  }
  if (node.kind === "call") {
    for (const arg of node.args) {
      walkExpressionNodes(arg, visit);
    }
    return;
  }
  if (node.kind === "switch") {
    walkExpressionNodes(node.input, visit);
    for (const switchCase of node.cases) {
      walkExpressionNodes(switchCase.when, visit);
      walkExpressionNodes(switchCase.then, visit);
    }
    walkExpressionNodes(node.default, visit);
    return;
  }
  if (node.kind === "formula") {
    for (const inputNode of Object.values(node.inputs)) {
      walkExpressionNodes(inputNode, visit);
    }
  }
}

export function collectFormulaNames(node: ExpressionNode): readonly string[] {
  const names: string[] = [];
  walkExpressionNodes(node, (current) => {
    if (current.kind === "formula") {
      names.push(current.name);
    }
  });
  return names;
}

export function evaluateExpression(
  node: ExpressionNode,
  scope: ExpressionScope,
): ExpressionValue {
  switch (node.kind) {
    case "literal":
      return node.value;
    case "field":
      if (node.source === "loaded") {
        return readPath(scope.loaded?.[node.alias], node.path);
      }
      if (node.source === "aggregate") {
        return scope.aggregates?.[node.alias] ?? null;
      }
      return readPath(
        node.source === "previous" ? scope.previous : scope.current,
        node.path,
      );
    case "input":
      return scope.inputs?.[node.name] ?? null;
    case "var":
      if (node.name === "now") {
        return scope.now.toISOString();
      }
      if (node.name === "userId") {
        return scope.userId ?? null;
      }
      if (node.name === "loopState") {
        return scope.loopState ?? null;
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
    case "call":
      return evaluateCallNode(node, scope);
    case "formula":
      return evaluateFormulaNode(node, scope);
    case "switch": {
      if (node.cases.length > MAX_SWITCH_CASES) {
        throw new ExpressionEvaluationError(
          `switch exceeds the maximum of ${MAX_SWITCH_CASES} cases.`,
        );
      }
      const inputValue = evaluateExpression(node.input, scope);
      for (const switchCase of node.cases) {
        const whenValue = evaluateExpression(switchCase.when, scope);
        if (looseEquals(inputValue, whenValue)) {
          return evaluateExpression(switchCase.then, scope);
        }
      }
      return evaluateExpression(node.default, scope);
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
  truthy as isTruthyExpressionValue,
};

export function isArrayLiteralNode(node: ExpressionNode): boolean {
  return node.kind === "literal" && Array.isArray(node.value);
}
