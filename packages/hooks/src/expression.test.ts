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

  it("short-circuits coalesce and if", () => {
    expect(
      evaluateExpression(
        {
          kind: "call",
          fn: "coalesce",
          args: [
            {
              kind: "field",
              source: "loaded",
              alias: "parent",
              path: "amount",
            },
            {
              kind: "binary",
              op: "+",
              left: {
                kind: "field",
                source: "current",
                path: "principalPortion",
              },
              right: {
                kind: "field",
                source: "current",
                path: "interestPortion",
              },
            },
          ],
        },
        scope({
          loaded: { parent: { amount: 626684 } },
          current: { principalPortion: null, interestPortion: null },
        }),
      ),
    ).toBe(626684);

    expect(
      evaluateExpression(
        {
          kind: "call",
          fn: "if",
          args: [
            { kind: "literal", value: true },
            { kind: "literal", value: "kept" },
            {
              kind: "binary",
              op: "+",
              left: { kind: "literal", value: null },
              right: { kind: "literal", value: null },
            },
          ],
        },
        scope(),
      ),
    ).toBe("kept");
  });

  it("reads loaded record fields by alias", () => {
    const node: ExpressionNode = {
      kind: "field",
      source: "loaded",
      alias: "parent",
      path: "frequency",
    };
    expect(
      evaluateExpression(
        node,
        scope({
          loaded: {
            parent: { frequency: "MONTHLY", id: "fi_1" },
          },
        }),
      ),
    ).toBe("MONTHLY");
  });

  it("returns null for unknown loaded alias", () => {
    const node: ExpressionNode = {
      kind: "field",
      source: "loaded",
      alias: "missing",
      path: "frequency",
    };
    expect(evaluateExpression(node, scope({ loaded: {} }))).toBe(null);
  });

  it("reads aggregate alias values", () => {
    const node: ExpressionNode = {
      kind: "field",
      source: "aggregate",
      alias: "total",
    };
    expect(
      evaluateExpression(
        node,
        scope({ aggregates: { total: 42, minDate: "2026-01-01" } }),
      ),
    ).toBe(42);
  });

  it("returns null for unknown aggregate alias", () => {
    const node: ExpressionNode = {
      kind: "field",
      source: "aggregate",
      alias: "missing",
    };
    expect(evaluateExpression(node, scope({ aggregates: {} }))).toBe(null);
  });

  it("evaluates switch with first matching case", () => {
    const node: ExpressionNode = {
      kind: "switch",
      input: { kind: "field", source: "current", path: "itemType" },
      cases: [
        {
          when: { kind: "literal", value: "MORTGAGE" },
          then: { kind: "literal", value: "LIABILITY" },
        },
        {
          when: { kind: "literal", value: "INVESTMENT" },
          then: { kind: "literal", value: "ASSET" },
        },
      ],
      default: { kind: "literal", value: "NONE" },
    };
    expect(
      evaluateExpression(node, scope({ current: { itemType: "INVESTMENT" } })),
    ).toBe("ASSET");
  });

  it("evaluates switch default when no case matches", () => {
    const node: ExpressionNode = {
      kind: "switch",
      input: { kind: "field", source: "current", path: "itemType" },
      cases: [
        {
          when: { kind: "literal", value: "MORTGAGE" },
          then: { kind: "literal", value: "LIABILITY" },
        },
      ],
      default: { kind: "literal", value: "NONE" },
    };
    expect(
      evaluateExpression(node, scope({ current: { itemType: "OTHER" } })),
    ).toBe("NONE");
  });

  it("evaluates switch with loose string equality", () => {
    const node: ExpressionNode = {
      kind: "switch",
      input: { kind: "literal", value: 1 },
      cases: [
        {
          when: { kind: "literal", value: "1" },
          then: { kind: "literal", value: "matched" },
        },
      ],
      default: { kind: "literal", value: "default" },
    };
    expect(evaluateExpression(node, scope())).toBe("matched");
  });

  it("evaluates switch then branch with loaded and aggregate fields", () => {
    const node: ExpressionNode = {
      kind: "switch",
      input: { kind: "literal", value: "A" },
      cases: [
        {
          when: { kind: "literal", value: "A" },
          then: {
            kind: "binary",
            op: "+",
            left: {
              kind: "field",
              source: "loaded",
              alias: "parent",
              path: "code",
            },
            right: {
              kind: "field",
              source: "aggregate",
              alias: "total",
            },
          },
        },
      ],
      default: { kind: "literal", value: "" },
    };
    expect(
      evaluateExpression(
        node,
        scope({
          loaded: { parent: { code: "X" } },
          aggregates: { total: 3 },
        }),
      ),
    ).toBe("X3");
  });
});

describe("expressionNodeSchema switch", () => {
  it("accepts a valid switch node", () => {
    const parsed = expressionNodeSchema.parse({
      kind: "switch",
      input: { kind: "literal", value: "key" },
      cases: [
        {
          when: { kind: "literal", value: "a" },
          then: { kind: "literal", value: "b" },
        },
      ],
      default: { kind: "literal", value: "c" },
    });
    expect(parsed.kind).toBe("switch");
  });

  it("rejects switch with more than 32 cases", () => {
    const cases = Array.from({ length: 33 }, (_, index) => ({
      when: { kind: "literal", value: String(index) },
      then: { kind: "literal", value: "x" },
    }));
    expect(() =>
      expressionNodeSchema.parse({
        kind: "switch",
        input: { kind: "literal", value: "key" },
        cases,
        default: { kind: "literal", value: "default" },
      }),
    ).toThrow();
  });

  it("rejects switch with empty cases array", () => {
    expect(() =>
      expressionNodeSchema.parse({
        kind: "switch",
        input: { kind: "literal", value: "key" },
        cases: [],
        default: { kind: "literal", value: "default" },
      }),
    ).toThrow();
  });
});

describe("expressionNodeSchema array literal", () => {
  it("accepts a flat array literal", () => {
    const parsed = expressionNodeSchema.parse({
      kind: "literal",
      value: ["MORTGAGE", "LOAN"],
    });
    expect(parsed).toEqual({
      kind: "literal",
      value: ["MORTGAGE", "LOAN"],
    });
  });

  it("evaluates array literal as-is", () => {
    expect(
      evaluateExpression({ kind: "literal", value: ["A", "B"] }, scope()),
    ).toEqual(["A", "B"]);
  });

  it("rejects empty array literal", () => {
    expect(() =>
      expressionNodeSchema.parse({
        kind: "literal",
        value: [],
      }),
    ).toThrow();
  });

  it("rejects array literal with more than 32 items", () => {
    expect(() =>
      expressionNodeSchema.parse({
        kind: "literal",
        value: Array.from({ length: 33 }, (_, index) => String(index)),
      }),
    ).toThrow();
  });

  it("evaluates pow and ln", () => {
    expect(
      evaluateExpression(
        {
          kind: "call",
          fn: "pow",
          args: [
            { kind: "literal", value: 2 },
            { kind: "literal", value: 10 },
          ],
        },
        scope(),
      ),
    ).toBe(1024);
    expect(
      evaluateExpression(
        { kind: "call", fn: "ln", args: [{ kind: "literal", value: Math.E }] },
        scope(),
      ),
    ).toBeCloseTo(1);
    const compoundStep = evaluateExpression(
      {
        kind: "binary",
        op: "-",
        left: {
          kind: "call",
          fn: "pow",
          args: [
            {
              kind: "binary",
              op: "+",
              left: { kind: "literal", value: 1 },
              right: {
                kind: "binary",
                op: "/",
                left: { kind: "literal", value: 12 },
                right: { kind: "literal", value: 100 },
              },
            },
            { kind: "literal", value: 1 / 12 },
          ],
        },
        right: { kind: "literal", value: 1 },
      },
      scope(),
    );
    expect(compoundStep).toBeGreaterThan(0.009);
    expect(compoundStep).toBeLessThan(0.011);
  });

  it("reads loopState variable", () => {
    expect(
      evaluateExpression(
        { kind: "var", name: "loopState" },
        scope({ loopState: 42 }),
      ),
    ).toBe(42);
  });

  it("memoizes invariant formula results within a shared cache scope", () => {
    let resolveCount = 0;
    const formulaResultCache = new Map<string, unknown>();
    const sharedScope = scope({
      tenantId: "tenant_a",
      current: { amount: 100 },
      formulaResultCache: formulaResultCache as Map<
        string,
        import("./expression.js").ExpressionValue
      >,
      formulaResolver: {
        resolve(name: string) {
          if (name !== "doubleAmount") {
            return undefined;
          }
          resolveCount += 1;
          return {
            name: "doubleAmount",
            inputs: [],
            body: {
              kind: "binary",
              op: "*",
              left: { kind: "field", source: "current", path: "amount" },
              right: { kind: "literal", value: 2 },
            },
          };
        },
      },
    });

    const node: ExpressionNode = {
      kind: "formula",
      name: "doubleAmount",
      inputs: {},
    };

    expect(evaluateExpression(node, sharedScope)).toBe(200);
    expect(evaluateExpression(node, sharedScope)).toBe(200);
    expect(resolveCount).toBe(1);
  });

  it("does not memoize formulas that depend on loopIndex", () => {
    let resolveCount = 0;
    const formulaResultCache = new Map<string, unknown>();
    const sharedScope = scope({
      tenantId: "tenant_a",
      loopIndex: 0,
      formulaResultCache: formulaResultCache as Map<
        string,
        import("./expression.js").ExpressionValue
      >,
      formulaResolver: {
        resolve(name: string) {
          if (name !== "withLoopIndex") {
            return undefined;
          }
          resolveCount += 1;
          return {
            name: "withLoopIndex",
            inputs: [],
            body: { kind: "var", name: "loopIndex" },
          };
        },
      },
    });

    const node: ExpressionNode = {
      kind: "formula",
      name: "withLoopIndex",
      inputs: {},
    };

    expect(evaluateExpression(node, sharedScope)).toBe(0);
    expect(evaluateExpression(node, { ...sharedScope, loopIndex: 1 })).toBe(1);
    expect(resolveCount).toBe(2);
  });
});
