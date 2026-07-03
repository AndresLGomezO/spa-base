import { describe, expect, it } from "vitest";

import { evaluateExpression, type ExpressionScope } from "@repo/hooks";

import {
  createFormulaResolver,
  getPlatformFormulaNames,
  toFormulaDefinitionForEval,
  validateFormulaCatalog,
} from "./index.js";
import { getPlatformFormulaDefinitions } from "./resolve-formula.js";

function scope(overrides: Partial<ExpressionScope> = {}): ExpressionScope {
  return {
    current: {},
    now: new Date("2026-06-15T12:00:00.000Z"),
    tenantId: "tenant_test",
    formulaResolver: createFormulaResolver(new Map()),
    ...overrides,
  };
}

describe("platform formula library", () => {
  it("loads math-only platform formulas", () => {
    expect(getPlatformFormulaNames()).toEqual([
      "annuityPayment",
      "simpleInterest",
    ]);
  });

  it("validates platform catalog without cycles", () => {
    const errors = validateFormulaCatalog(getPlatformFormulaDefinitions());
    expect(errors).toEqual([]);
  });
});

describe("formula composition", () => {
  it("detects circular dependencies in catalog validation", () => {
    const errors = validateFormulaCatalog([
      {
        name: "a",
        inputs: [],
        body: {
          kind: "formula",
          name: "b",
          inputs: {},
        },
        enabled: true,
      },
      {
        name: "b",
        inputs: [],
        body: {
          kind: "formula",
          name: "a",
          inputs: {},
        },
        enabled: true,
      },
    ]);
    expect(errors.some((error) => error.message.includes("Circular"))).toBe(
      true,
    );
  });

  it("resolves tenant formulas before platform formulas", () => {
    const tenantResolver = createFormulaResolver(
      new Map([
        [
          "annuityPayment",
          toFormulaDefinitionForEval({
            name: "annuityPayment",
            inputs: [
              { name: "principal", required: true },
              { name: "ratePerPeriod", required: true },
              { name: "periods", required: true },
            ],
            body: { kind: "literal", value: 0.99 },
          }),
        ],
      ]),
    );

    const result = evaluateExpression(
      {
        kind: "formula",
        name: "annuityPayment",
        inputs: {
          principal: { kind: "literal", value: 1 },
          ratePerPeriod: { kind: "literal", value: 0.01 },
          periods: { kind: "literal", value: 12 },
        },
      },
      scope({ formulaResolver: tenantResolver }),
    );

    expect(result).toBe(0.99);
  });
});

describe("math layer formulas", () => {
  it("computes annuityPayment from literal inputs", () => {
    const result = evaluateExpression(
      {
        kind: "formula",
        name: "annuityPayment",
        inputs: {
          principal: { kind: "literal", value: 100_000 },
          ratePerPeriod: { kind: "literal", value: 0.01 },
          periods: { kind: "literal", value: 12 },
        },
      },
      scope(),
    );
    expect(result).toBeCloseTo(8884.88, 0);
  });

  it("computes simpleInterest from literal inputs", () => {
    const result = evaluateExpression(
      {
        kind: "formula",
        name: "simpleInterest",
        inputs: {
          amount: { kind: "literal", value: 18_650_000 },
          rate: { kind: "literal", value: 0.0204 },
        },
      },
      scope(),
    );
    expect(result).toBeCloseTo(380_460, 0);
  });
});
