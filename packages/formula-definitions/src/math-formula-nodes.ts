import type { ExpressionNode } from "@repo/hooks";

export function lit(value: string | number | boolean | null): ExpressionNode {
  return { kind: "literal", value };
}

export function inputRef(name: string): ExpressionNode {
  return { kind: "input", name };
}

export function formulaRef(
  name: string,
  inputs: Record<string, ExpressionNode> = {},
): ExpressionNode {
  return { kind: "formula", name, inputs };
}

export function call(fn: string, ...args: ExpressionNode[]): ExpressionNode {
  return { kind: "call", fn: fn as never, args };
}

export function coalesce(...args: ExpressionNode[]): ExpressionNode {
  return call("coalesce", ...args);
}

export function binary(
  op: "+" | "-" | "*" | "/" | ">=" | ">" | "==" | "!=" | "&&" | "||",
  left: ExpressionNode,
  right: ExpressionNode,
): ExpressionNode {
  return { kind: "binary", op, left, right };
}

export function unary(op: "!" | "-", operand: ExpressionNode): ExpressionNode {
  return { kind: "unary", op, operand };
}

export function ifExpr(
  condition: ExpressionNode,
  then: ExpressionNode,
  otherwise?: ExpressionNode,
): ExpressionNode {
  return otherwise != null
    ? call("if", condition, then, otherwise)
    : call("if", condition, then);
}

function onePlusRate(rate: ExpressionNode): ExpressionNode {
  return binary("+", lit(1), rate);
}

function powOnePlusRateToPeriods(
  rate: ExpressionNode,
  periods: ExpressionNode,
): ExpressionNode {
  return call("pow", onePlusRate(rate), periods);
}

export function annuityPaymentBody(
  principal: ExpressionNode,
  ratePerPeriod: ExpressionNode,
  periods: ExpressionNode,
): ExpressionNode {
  const powTerm = powOnePlusRateToPeriods(ratePerPeriod, periods);
  return binary(
    "/",
    binary("*", binary("*", principal, ratePerPeriod), powTerm),
    binary("-", powTerm, lit(1)),
  );
}

export function simpleInterestBody(
  amount: ExpressionNode,
  rate: ExpressionNode,
): ExpressionNode {
  return binary("*", amount, rate);
}
