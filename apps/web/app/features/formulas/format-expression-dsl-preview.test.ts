import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ExpressionNode } from "@repo/hooks";

import { formatExpressionDsl } from "./format-expression-dsl-preview";

const ratesFormulasPath = resolve(
  import.meta.dirname,
  "../../../../../apps/api/src/admin/rates-tenant/catalogs/rates-formula-definitions.json",
);

function loadLoanPrincipalPaymentBody(): ExpressionNode {
  const catalog = JSON.parse(readFileSync(ratesFormulasPath, "utf8")) as {
    formulaDefinitions: Array<{ name: string; body: ExpressionNode }>;
  };
  const formula = catalog.formulaDefinitions.find(
    (entry) => entry.name === "loanPrincipalPayment",
  );
  if (!formula) {
    throw new Error("loanPrincipalPayment not found in rates formulas.");
  }
  return formula.body;
}

describe("formatExpressionDsl", () => {
  it("formats literals and fields", () => {
    expect(
      formatExpressionDsl({
        kind: "field",
        source: "current",
        path: "principalPortion",
      }),
    ).toBe("current.principalPortion");

    expect(
      formatExpressionDsl({
        kind: "field",
        source: "loaded",
        alias: "parent",
        path: "currentBalance",
      }),
    ).toBe("parent.currentBalance");

    expect(
      formatExpressionDsl({
        kind: "field",
        source: "aggregate",
        alias: "monthlyAddOns",
      }),
    ).toBe("aggregate(monthlyAddOns)");

    expect(formatExpressionDsl({ kind: "literal", value: "FRENCH" })).toBe(
      '"FRENCH"',
    );
    expect(formatExpressionDsl({ kind: "literal", value: 0 })).toBe("0");
  });

  it("formats vars and inputs", () => {
    expect(formatExpressionDsl({ kind: "var", name: "loopIndex" })).toBe(
      "loopIndex",
    );
    expect(formatExpressionDsl({ kind: "var", name: "now" })).toBe("now()");
    expect(formatExpressionDsl({ kind: "input", name: "rate" })).toBe(
      "input.rate",
    );
  });

  it("formats simple binary and call on one line", () => {
    expect(
      formatExpressionDsl({
        kind: "binary",
        op: "+",
        left: { kind: "literal", value: 1 },
        right: { kind: "literal", value: 2 },
      }),
    ).toBe("1 + 2");

    expect(
      formatExpressionDsl({
        kind: "call",
        fn: "coalesce",
        args: [
          { kind: "field", source: "current", path: "termMonths" },
          { kind: "literal", value: 12 },
        ],
      }),
    ).toBe("coalesce(current.termMonths, 12)");
  });

  it("formats formula subtraction on one line", () => {
    expect(
      formatExpressionDsl({
        kind: "binary",
        op: "-",
        left: { kind: "formula", name: "loanPeriodBalance", inputs: {} },
        right: { kind: "formula", name: "schedulePrincipalPortion", inputs: {} },
      }),
    ).toBe("loanPeriodBalance - schedulePrincipalPortion");

    expect(
      formatExpressionDsl({
        kind: "binary",
        op: "-",
        left: { kind: "formula", name: "loanAnnuityPayment", inputs: {} },
        right: { kind: "formula", name: "loanInterestPayment", inputs: {} },
      }),
    ).toBe("loanAnnuityPayment - loanInterestPayment");
  });

  it("formats nested binary on one line", () => {
    expect(
      formatExpressionDsl({
        kind: "binary",
        op: "-",
        left: {
          kind: "binary",
          op: "+",
          left: { kind: "literal", value: 1 },
          right: { kind: "literal", value: 2 },
        },
        right: { kind: "literal", value: 3 },
      }),
    ).toBe("1 + 2 - 3");
  });

  it("formats amortizationLoopState from catalog on one line", () => {
    const catalog = JSON.parse(readFileSync(ratesFormulasPath, "utf8")) as {
      formulaDefinitions: Array<{ name: string; body: ExpressionNode }>;
    };
    const amortizationLoopState = catalog.formulaDefinitions.find(
      (entry) => entry.name === "amortizationLoopState",
    );
    expect(amortizationLoopState).toBeDefined();
    expect(formatExpressionDsl(amortizationLoopState!.body)).toBe(
      "loanPeriodBalance - schedulePrincipalPortion",
    );
  });

  it("formats switch with indented branches", () => {
    const dsl = formatExpressionDsl({
      kind: "switch",
      input: {
        kind: "field",
        source: "current",
        path: "amortizationType",
      },
      cases: [
        {
          when: { kind: "literal", value: "NONE" },
          then: {
            kind: "call",
            fn: "coalesce",
            args: [
              { kind: "field", source: "current", path: "principalPortion" },
              { kind: "literal", value: 0 },
            ],
          },
        },
        {
          when: { kind: "literal", value: "GERMAN" },
          then: {
            kind: "binary",
            op: "/",
            left: { kind: "var", name: "loopState" },
            right: { kind: "literal", value: 12 },
          },
        },
      ],
      default: { kind: "literal", value: 0 },
    });

    expect(dsl).toContain('switch current.amortizationType {');
    expect(dsl).toContain('  when "NONE":');
    expect(dsl).toContain("    coalesce(current.principalPortion, 0)");
    expect(dsl).toContain('  when "GERMAN":');
    expect(dsl).toContain("    loopState / 12");
    expect(dsl).toContain("  default:");
    expect(dsl).toContain("    0");
    expect(dsl).toContain("}");
  });

  it("formats formula references with named inputs", () => {
    expect(
      formatExpressionDsl({
        kind: "formula",
        name: "monthlyRateFromQuote",
        inputs: {
          quote: { kind: "field", source: "current", path: "interestRateQuote" },
          rate: { kind: "field", source: "current", path: "interestRate" },
        },
      }),
    ).toBe(
      "monthlyRateFromQuote(quote: current.interestRateQuote, rate: current.interestRate)",
    );
  });

  it("formats schedulePrincipalPortion as delegation to loanPrincipalPayment", () => {
    const catalog = JSON.parse(readFileSync(ratesFormulasPath, "utf8")) as {
      formulaDefinitions: Array<{ name: string; body: ExpressionNode }>;
    };
    const schedulePrincipal = catalog.formulaDefinitions.find(
      (entry) => entry.name === "schedulePrincipalPortion",
    );
    expect(schedulePrincipal).toBeDefined();
    expect(formatExpressionDsl(schedulePrincipal!.body)).toBe(
      "loanPrincipalPayment",
    );
  });

  it("formats loanPrincipalPayment strategy switch with readable structure", () => {
    const body = loadLoanPrincipalPaymentBody();
    const dsl = formatExpressionDsl(body);

    expect(dsl).toContain(
      'switch coalesce(current.amortizationType, "FRENCH") {',
    );
    expect(dsl).toContain('  when "NONE":');
    expect(dsl).toContain("    coalesce(current.principalPortion, 0)");
    expect(dsl).toContain('  when "GERMAN":');
    expect(dsl).toContain("loanPeriodBalance");
    expect(dsl).toContain("loanTermMonths");
    expect(dsl).toContain('  when "AMERICAN":');
    expect(dsl).toContain('  when "BULLET":');
    expect(dsl).toContain("  default:");
    expect(dsl).toContain("    loanAnnuityPayment - loanInterestPayment");
  });
});
