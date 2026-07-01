import { describe, expect, it } from "vitest";

import {
  evaluateExpression,
  ExpressionEvaluationError,
  expressionNodeSchema,
  type ExpressionNode,
  type ExpressionScope,
} from "./expression.js";

function scope(overrides: Partial<ExpressionScope> = {}): ExpressionScope {
  return {
    current: {},
    now: new Date("2026-06-15T12:00:00.000Z"),
    ...overrides,
  };
}

describe("evaluateExpression", () => {
  it("reads current and previous fields", () => {
    const node: ExpressionNode = {
      kind: "binary",
      op: "-",
      left: { kind: "field", source: "current", path: "amount" },
      right: { kind: "field", source: "previous", path: "amount" },
    };
    expect(
      evaluateExpression(
        node,
        scope({ current: { amount: 120 }, previous: { amount: 100 } }),
      ),
    ).toBe(20);
  });

  it("reads nested field paths", () => {
    const node: ExpressionNode = {
      kind: "field",
      source: "current",
      path: "contract.balance",
    };
    expect(
      evaluateExpression(
        node,
        scope({ current: { contract: { balance: 42 } } }),
      ),
    ).toBe(42);
  });

  it("performs arithmetic with precedence via nesting", () => {
    const node: ExpressionNode = {
      kind: "binary",
      op: "+",
      left: { kind: "literal", value: 2 },
      right: {
        kind: "binary",
        op: "*",
        left: { kind: "literal", value: 3 },
        right: { kind: "literal", value: 4 },
      },
    };
    expect(evaluateExpression(node, scope())).toBe(14);
  });

  it("throws on division by zero", () => {
    const node: ExpressionNode = {
      kind: "binary",
      op: "/",
      left: { kind: "literal", value: 1 },
      right: { kind: "literal", value: 0 },
    };
    expect(() => evaluateExpression(node, scope())).toThrow(
      ExpressionEvaluationError,
    );
  });

  it("evaluates now() from the scope clock", () => {
    const node: ExpressionNode = { kind: "call", fn: "now", args: [] };
    expect(evaluateExpression(node, scope())).toBe("2026-06-15T12:00:00.000Z");
  });

  it("adds days with dateAdd", () => {
    const node: ExpressionNode = {
      kind: "call",
      fn: "dateAdd",
      args: [
        { kind: "literal", value: "2026-01-01T00:00:00.000Z" },
        { kind: "literal", value: 45 },
        { kind: "literal", value: "DAY" },
      ],
    };
    expect(evaluateExpression(node, scope())).toBe("2026-02-15T00:00:00.000Z");
  });

  it("adds months across a year boundary", () => {
    const node: ExpressionNode = {
      kind: "call",
      fn: "dateAdd",
      args: [
        { kind: "literal", value: "2026-11-15T00:00:00.000Z" },
        { kind: "literal", value: 3 },
        { kind: "literal", value: "MONTH" },
      ],
    };
    expect(evaluateExpression(node, scope())).toBe("2027-02-15T00:00:00.000Z");
  });

  it("computes day differences with dateDiff", () => {
    const node: ExpressionNode = {
      kind: "call",
      fn: "dateDiff",
      args: [
        { kind: "literal", value: "2026-01-01T00:00:00.000Z" },
        { kind: "literal", value: "2026-01-11T00:00:00.000Z" },
        { kind: "literal", value: "DAY" },
      ],
    };
    expect(evaluateExpression(node, scope())).toBe(10);
  });

  it("computes month differences with dateDiff", () => {
    const node: ExpressionNode = {
      kind: "call",
      fn: "dateDiff",
      args: [
        { kind: "literal", value: "2026-01-15T00:00:00.000Z" },
        { kind: "literal", value: "2026-04-10T00:00:00.000Z" },
        { kind: "literal", value: "MONTH" },
      ],
    };
    expect(evaluateExpression(node, scope())).toBe(2);
  });

  it("short-circuits logical operators", () => {
    const node: ExpressionNode = {
      kind: "binary",
      op: "&&",
      left: { kind: "literal", value: false },
      right: {
        kind: "binary",
        op: "/",
        left: { kind: "literal", value: 1 },
        right: { kind: "literal", value: 0 },
      },
    };
    expect(evaluateExpression(node, scope())).toBe(false);
  });

  it("concatenates with the + operator when a string is present", () => {
    const node: ExpressionNode = {
      kind: "binary",
      op: "+",
      left: { kind: "literal", value: "loan-" },
      right: { kind: "var", name: "loopIndex" },
    };
    expect(evaluateExpression(node, scope({ loopIndex: 2 }))).toBe("loan-2");
  });

  it("validates the AST schema round-trip", () => {
    const node: ExpressionNode = {
      kind: "call",
      fn: "coalesce",
      args: [
        { kind: "field", source: "current", path: "status" },
        { kind: "literal", value: "DRAFT" },
      ],
    };
    expect(expressionNodeSchema.parse(node)).toEqual(node);
  });

  it("evaluates text and conditional functions", () => {
    const ifNode: ExpressionNode = {
      kind: "call",
      fn: "if",
      args: [
        { kind: "literal", value: true },
        { kind: "literal", value: "yes" },
        { kind: "literal", value: "no" },
      ],
    };
    expect(evaluateExpression(ifNode, scope())).toBe("yes");

    expect(
      evaluateExpression(
        {
          kind: "call",
          fn: "substring",
          args: [
            { kind: "literal", value: "hello" },
            { kind: "literal", value: 1 },
            { kind: "literal", value: 4 },
          ],
        },
        scope(),
      ),
    ).toBe("ell");

    expect(
      evaluateExpression(
        {
          kind: "call",
          fn: "startsWith",
          args: [
            { kind: "literal", value: "prefix-value" },
            { kind: "literal", value: "prefix" },
          ],
        },
        scope(),
      ),
    ).toBe(true);
  });
});
