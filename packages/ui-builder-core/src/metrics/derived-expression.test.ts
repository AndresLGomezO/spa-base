import { describe, expect, it } from "vitest";

import type { MetricDerivedExpressionToken } from "../types/component.js";
import {
  evaluateDerivedExpression,
  extractMetricDefinitionIds,
  migrateLegacyDerivedTerms,
  validateDerivedExpressionGrammar,
} from "./derived-expression.js";

const metricA = "metric-a";
const metricB = "metric-b";
const metricC = "metric-c";

function metricToken(id: string): MetricDerivedExpressionToken {
  return { type: "metric", metricDefinitionId: id };
}

function constantToken(value: number): MetricDerivedExpressionToken {
  return { type: "constant", value };
}

function operatorToken(
  op: Extract<MetricDerivedExpressionToken, { type: "operator" }>["op"],
): MetricDerivedExpressionToken {
  return { type: "operator", op };
}

function parenToken(
  side: Extract<MetricDerivedExpressionToken, { type: "paren" }>["side"],
): MetricDerivedExpressionToken {
  return { type: "paren", side };
}

function resolveValues(values: Record<string, number | null>) {
  return (metricDefinitionId: string) => values[metricDefinitionId] ?? null;
}

describe("migrateLegacyDerivedTerms", () => {
  it("maps +/-1 two-term weighted sum to subtraction", () => {
    expect(
      migrateLegacyDerivedTerms([
        { metricDefinitionId: metricA, multiplier: 1 },
        { metricDefinitionId: metricB, multiplier: -1 },
      ]),
    ).toEqual([metricToken(metricA), operatorToken("-"), metricToken(metricB)]);
  });

  it("preserves general weighted-sum semantics with constants", () => {
    expect(
      migrateLegacyDerivedTerms([
        { metricDefinitionId: metricA, multiplier: 2 },
        { metricDefinitionId: metricB, multiplier: -3 },
      ]),
    ).toEqual([
      constantToken(2),
      operatorToken("*"),
      metricToken(metricA),
      operatorToken("-"),
      constantToken(3),
      operatorToken("*"),
      metricToken(metricB),
    ]);
  });
});

describe("validateDerivedExpressionGrammar", () => {
  it("accepts a single metric operand", () => {
    expect(validateDerivedExpressionGrammar([metricToken(metricA)])).toBeNull();
  });

  it("rejects trailing operators", () => {
    expect(
      validateDerivedExpressionGrammar([
        metricToken(metricA),
        operatorToken("+"),
      ]),
    ).toBe("missingOperand");
  });

  it("rejects unbalanced parentheses", () => {
    expect(
      validateDerivedExpressionGrammar([
        parenToken("open"),
        metricToken(metricA),
        operatorToken("-"),
        metricToken(metricB),
      ]),
    ).toBe("unbalancedParens");
  });
});

describe("evaluateDerivedExpression", () => {
  it("applies PEMDAS without parentheses", () => {
    const result = evaluateDerivedExpression({
      tokens: [
        metricToken(metricA),
        operatorToken("+"),
        metricToken(metricB),
        operatorToken("*"),
        metricToken(metricC),
      ],
      resolveMetricValue: resolveValues({
        [metricA]: 5,
        [metricB]: 3,
        [metricC]: 2,
      }),
    });

    expect(result).toEqual({ value: 11 });
  });

  it("evaluates grouped expressions", () => {
    const result = evaluateDerivedExpression({
      tokens: [
        parenToken("open"),
        metricToken(metricA),
        operatorToken("-"),
        metricToken(metricB),
        parenToken("close"),
        operatorToken("/"),
        metricToken(metricA),
      ],
      resolveMetricValue: resolveValues({
        [metricA]: 100,
        [metricB]: 25,
      }),
    });

    expect(result).toEqual({ value: 0.75 });
  });

  it("supports numeric constants", () => {
    const result = evaluateDerivedExpression({
      tokens: [metricToken(metricA), operatorToken("*"), constantToken(0.15)],
      resolveMetricValue: resolveValues({ [metricA]: 1000 }),
    });

    expect(result).toEqual({ value: 150 });
  });

  it("treats missing metric rows as zero but returns empty when all are missing", () => {
    expect(
      evaluateDerivedExpression({
        tokens: [
          metricToken(metricA),
          operatorToken("-"),
          metricToken(metricB),
        ],
        resolveMetricValue: resolveValues({
          [metricA]: 100,
          [metricB]: null,
        }),
      }),
    ).toEqual({ value: 100 });

    expect(
      evaluateDerivedExpression({
        tokens: [
          metricToken(metricA),
          operatorToken("-"),
          metricToken(metricB),
        ],
        resolveMetricValue: resolveValues({
          [metricA]: null,
          [metricB]: null,
        }),
      }),
    ).toEqual({ value: null });
  });

  it("returns divideByZero when dividing by zero", () => {
    const result = evaluateDerivedExpression({
      tokens: [metricToken(metricA), operatorToken("/"), metricToken(metricB)],
      resolveMetricValue: resolveValues({
        [metricA]: 10,
        [metricB]: 0,
      }),
    });

    expect(result).toEqual({ value: null, error: "divideByZero" });
  });

  it("evaluates left-to-right for same-precedence division and multiplication", () => {
    const result = evaluateDerivedExpression({
      tokens: [
        metricToken(metricA),
        operatorToken("/"),
        metricToken(metricB),
        operatorToken("*"),
        metricToken(metricC),
      ],
      resolveMetricValue: resolveValues({
        [metricA]: 100,
        [metricB]: 5,
        [metricC]: 2,
      }),
    });

    expect(result).toEqual({ value: 40 });
  });
});

describe("extractMetricDefinitionIds", () => {
  it("returns unique metric ids in encounter order", () => {
    expect(
      extractMetricDefinitionIds([
        metricToken(metricA),
        operatorToken("+"),
        metricToken(metricB),
        operatorToken("+"),
        metricToken(metricA),
      ]),
    ).toEqual([metricA, metricB]);
  });
});
