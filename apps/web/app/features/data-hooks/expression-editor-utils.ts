import type {
  ExpressionBinaryOperator,
  ExpressionFunction,
  ExpressionNode,
  ExpressionSwitchCase,
  ExpressionUnaryOperator,
} from "@repo/hooks";
import {
  EXPRESSION_BINARY_OPERATORS,
  EXPRESSION_FUNCTIONS,
  EXPRESSION_UNARY_OPERATORS,
  MAX_SWITCH_CASES,
  getExpressionFunctionSpec,
} from "@repo/hooks";

export type EditorKind =
  | "literal"
  | "field"
  | "now"
  | "loopIndex"
  | "formula"
  | "binary"
  | "unary"
  | "call"
  | "switch"
  | "advanced";

export function literalExpression(
  value: string | number | boolean = "",
): ExpressionNode {
  return { kind: "literal", value };
}

export function resolveEditorKind(node: ExpressionNode): EditorKind {
  if (node.kind === "literal") {
    if (Array.isArray(node.value)) return "advanced";
    return "literal";
  }
  if (node.kind === "field") return "field";
  if (node.kind === "var") {
    return node.name === "loopIndex" ? "loopIndex" : "now";
  }
  if (node.kind === "binary") return "binary";
  if (node.kind === "unary") return "unary";
  if (node.kind === "call") return "call";
  if (node.kind === "switch") return "switch";
  if (node.kind === "formula") return "formula";
  return "advanced";
}

export function createDefaultNode(
  kind: EditorKind,
  fieldNames?: readonly string[],
): ExpressionNode {
  switch (kind) {
    case "literal":
      return literalExpression("");
    case "field":
      return {
        kind: "field",
        source: "current",
        path: fieldNames?.[0] ?? "",
      };
    case "now":
      return { kind: "var", name: "now" };
    case "loopIndex":
      return { kind: "var", name: "loopIndex" };
    case "formula":
      return { kind: "formula", name: "", inputs: {} };
    case "binary":
      return {
        kind: "binary",
        op: "+",
        left: literalExpression(0),
        right: literalExpression(0),
      };
    case "unary":
      return {
        kind: "unary",
        op: "-",
        operand: literalExpression(0),
      };
    case "call":
      return {
        kind: "call",
        fn: "concat",
        args: [literalExpression("")],
      };
    case "switch":
      return {
        kind: "switch",
        input: {
          kind: "field",
          source: "current",
          path: fieldNames?.[0] ?? "",
        },
        cases: [createDefaultSwitchCase()],
        default: literalExpression(""),
      };
    case "advanced":
      return literalExpression("");
  }
}

export function listBinaryOperators(): readonly ExpressionBinaryOperator[] {
  return EXPRESSION_BINARY_OPERATORS;
}

export function listUnaryOperators(): readonly ExpressionUnaryOperator[] {
  return EXPRESSION_UNARY_OPERATORS;
}

export function listExpressionFunctions(): readonly ExpressionFunction[] {
  return EXPRESSION_FUNCTIONS;
}

export function binaryOperatorLabelKey(op: ExpressionBinaryOperator): string {
  return `dataHooks.expression.operators.binary.${op}`;
}

export function unaryOperatorLabelKey(op: ExpressionUnaryOperator): string {
  return `dataHooks.expression.operators.unary.${op}`;
}

export function expressionFunctionLabelKey(fn: ExpressionFunction): string {
  return `dataHooks.expression.functions.${fn}`;
}

export function createDefaultCallArgs(
  fn: ExpressionFunction,
  currentArgs: readonly ExpressionNode[],
): ExpressionNode[] {
  const spec = getExpressionFunctionSpec(fn);
  if (spec.variadic) {
    const nextCount = Math.max(currentArgs.length, spec.minArgs);
    return Array.from(
      { length: nextCount },
      (_, index) => currentArgs[index] ?? literalExpression(""),
    );
  }

  const args: ExpressionNode[] = [];
  for (let index = 0; index < spec.maxArgs; index += 1) {
    const argSpec = spec.args[index];
    if (currentArgs[index]) {
      args.push(currentArgs[index]!);
      continue;
    }
    if (argSpec?.kind === "dateUnit") {
      args.push(literalExpression("DAY"));
      continue;
    }
    args.push(literalExpression(""));
  }
  return args;
}

export function canAddCallArgument(
  fn: ExpressionFunction,
  currentCount: number,
): boolean {
  const spec = getExpressionFunctionSpec(fn);
  return Boolean(spec.variadic && currentCount < spec.maxArgs);
}

export function canRemoveCallArgument(
  fn: ExpressionFunction,
  currentCount: number,
): boolean {
  const spec = getExpressionFunctionSpec(fn);
  return Boolean(spec.variadic && currentCount > spec.minArgs);
}

export function shouldShowCallArgument(
  fn: ExpressionFunction,
  argIndex: number,
  args: readonly ExpressionNode[],
  useOptionalThirdArg: boolean,
): boolean {
  const spec = getExpressionFunctionSpec(fn);
  if (spec.variadic) {
    return argIndex < args.length;
  }
  if (fn === "substring" && argIndex === 2) {
    return useOptionalThirdArg;
  }
  return argIndex < spec.maxArgs;
}

export function createDefaultSwitchCase(): ExpressionSwitchCase {
  return {
    when: literalExpression(""),
    then: literalExpression(""),
  };
}

export function canAddSwitchCase(currentCount: number): boolean {
  return currentCount < MAX_SWITCH_CASES;
}

export function canRemoveSwitchCase(currentCount: number): boolean {
  return currentCount > 1;
}

export const EXPRESSION_PREVIEW_MOCK_SCOPE = {
  current: { amount: 100, status: "Pending" },
  previous: { amount: 50, status: "Draft" },
  now: new Date("2024-06-15T12:00:00.000Z"),
  userId: "preview-user",
  loopIndex: 0,
} as const;
