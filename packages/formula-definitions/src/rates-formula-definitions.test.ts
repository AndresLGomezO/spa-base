import { describe, expect, it } from "vitest";

import {
  evaluateExpression,
  type ExpressionNode,
  type ExpressionScope,
} from "@repo/hooks";

import { getPlatformFormulaNames, validateFormulaCatalog } from "./index.js";
import {
  createRatesFormulaResolver,
  loadRatesFormulaDefinitions,
} from "./rates-formula-test-utils.js";

function scope(overrides: Partial<ExpressionScope> = {}): ExpressionScope {
  return {
    current: {},
    now: new Date("2026-06-15T12:00:00.000Z"),
    tenantId: "tenant_test",
    formulaResolver: createRatesFormulaResolver(),
    ...overrides,
  };
}

function evaluateRatesFormula(
  name: string,
  overrides: Partial<ExpressionScope> = {},
): unknown {
  return evaluateExpression(
    { kind: "formula", name, inputs: {} },
    scope(overrides),
  );
}

function evaluateRatesFormulaWithInputs(
  name: string,
  inputs: Record<string, ExpressionNode>,
  overrides: Partial<ExpressionScope> = {},
): unknown {
  return evaluateExpression(
    { kind: "formula", name, inputs },
    scope(overrides),
  );
}

const hipotecaScope: Partial<ExpressionScope> = {
  current: {
    termMonths: 240,
    interestRate: 10.56,
    interestRateQuote: "EA",
    originalPrincipal: 361_000_000,
    amortizationType: "FRENCH",
  },
  loaded: {
    parent: {
      currentBalance: 354_603_512,
      amount: 3_695_000,
    },
  },
};

const germanScope: Partial<ExpressionScope> = {
  current: {
    termMonths: 60,
    interestRate: 2.04,
    interestRateQuote: "NMV",
    amortizationType: "GERMAN",
  },
  loaded: {
    parent: {
      currentBalance: 18_650_000,
      amount: 692_487,
    },
  },
  loopState: 18_650_000,
  loopIndex: 0,
};

describe("rates tenant formula catalog", () => {
  it("validates against platform math dependencies", () => {
    const errors = validateFormulaCatalog(
      loadRatesFormulaDefinitions(),
      new Set(getPlatformFormulaNames()),
    );
    expect(errors).toEqual([]);
  });
});

describe("monthlyRateFromQuote", () => {
  const node: ExpressionNode = {
    kind: "formula",
    name: "monthlyRateFromQuote",
    inputs: {
      rate: { kind: "literal", value: 10.56 },
      quote: { kind: "literal", value: "EA" },
    },
  };

  it("converts EA quoted rate to monthly decimal", () => {
    const result = evaluateExpression(node, scope());
    expect(result).toBeCloseTo(0.008401, 4);
  });

  it("converts NMV quoted rate", () => {
    const nmvNode: ExpressionNode = {
      kind: "formula",
      name: "monthlyRateFromQuote",
      inputs: {
        rate: { kind: "literal", value: 2.04 },
        quote: { kind: "literal", value: "NMV" },
      },
    };
    expect(evaluateExpression(nmvNode, scope())).toBeCloseTo(0.0204, 5);
  });
});

describe("loan state atoms", () => {
  it("defaults loanTermMonths to 12 when termMonths is missing", () => {
    expect(evaluateRatesFormula("loanTermMonths")).toBe(12);
  });

  it("reads loanTermMonths from current.termMonths", () => {
    expect(evaluateRatesFormula("loanTermMonths", hipotecaScope)).toBe(240);
  });

  it("converts EA quote to loanMonthlyRate", () => {
    expect(evaluateRatesFormula("loanMonthlyRate", hipotecaScope)).toBeCloseTo(
      0.008401,
      4,
    );
  });

  it("prefers loopState for loanPeriodBalance", () => {
    expect(
      evaluateRatesFormula("loanPeriodBalance", {
        ...germanScope,
        loopState: 1_234_567,
      }),
    ).toBe(1_234_567);
  });
});

describe("loan strategy formulas", () => {
  it("computes loanPrincipalPayment for GERMAN as balance divided by term", () => {
    expect(
      evaluateRatesFormula("loanPrincipalPayment", germanScope),
    ).toBeCloseTo(310_833, 0);
  });

  it("computes loanInterestPayment as balance times monthly rate", () => {
    expect(
      evaluateRatesFormula("loanInterestPayment", germanScope),
    ).toBeCloseTo(380_460, 0);
  });

  it("computes loanPrincipalPayment for FRENCH as annuity payment minus interest", () => {
    const principal = evaluateRatesFormula("loanPrincipalPayment", {
      ...hipotecaScope,
      loopState: 354_603_512,
      loopIndex: 0,
    });
    const interest = evaluateRatesFormula("loanInterestPayment", {
      ...hipotecaScope,
      loopState: 354_603_512,
      loopIndex: 0,
    });
    const payment = evaluateRatesFormula("loanAnnuityPayment", {
      ...hipotecaScope,
      loopState: 354_603_512,
      loopIndex: 0,
    });

    expect(principal).toEqual(Number(payment) - Number(interest));
    expect(Number(principal)).toBeGreaterThan(0);
  });
});

describe("recurring schedule formulas", () => {
  const frequencyInput = (frequency: string): ExpressionNode => ({
    kind: "literal",
    value: frequency,
  });

  it("maps frequency to step multiplier", () => {
    expect(
      evaluateRatesFormulaWithInputs("frequencyStepMultiplier", {
        frequency: frequencyInput("BIWEEKLY"),
      }),
    ).toBe(2);
    expect(
      evaluateRatesFormulaWithInputs("frequencyStepMultiplier", {
        frequency: frequencyInput("QUARTERLY"),
      }),
    ).toBe(3);
    expect(
      evaluateRatesFormulaWithInputs("frequencyStepMultiplier", {
        frequency: frequencyInput("MONTHLY"),
      }),
    ).toBe(1);
  });

  it("maps frequency to dateAdd unit", () => {
    expect(
      evaluateRatesFormulaWithInputs("frequencyUnit", {
        frequency: frequencyInput("ANNUAL"),
      }),
    ).toBe("YEAR");
    expect(
      evaluateRatesFormulaWithInputs("frequencyUnit", {
        frequency: frequencyInput("BIWEEKLY"),
      }),
    ).toBe("WEEK");
  });

  it("computes batch schedule due dates from loopIndex", () => {
    const anchor = "2026-01-15";
    const quarterlyDueDate = evaluateRatesFormulaWithInputs(
      "frequencyScheduleDueDate",
      {
        baseDate: { kind: "literal", value: anchor },
        frequency: frequencyInput("QUARTERLY"),
      },
      { loopIndex: 2 },
    );
    expect(quarterlyDueDate).toBe("2026-07-15T00:00:00.000Z");
  });

  it("advances due date by one frequency step", () => {
    const advanced = evaluateRatesFormulaWithInputs("frequencyAdvanceDueDate", {
      baseDate: { kind: "literal", value: "2026-03-01" },
      frequency: frequencyInput("BIWEEKLY"),
    });
    expect(advanced).toBe("2026-03-15T00:00:00.000Z");
  });

  it("defaults schedule horizon to 12 months", () => {
    expect(evaluateRatesFormula("scheduleHorizonOrDefault")).toBe(12);
    expect(
      evaluateRatesFormula("scheduleHorizonOrDefault", {
        current: { scheduleHorizonMonths: 24 },
      }),
    ).toBe(24);
  });

  it("computes initial row count for ONE_TIME vs recurring items", () => {
    expect(
      evaluateRatesFormulaWithInputs("recurringScheduleInitialRowCount", {
        frequency: frequencyInput("ONE_TIME"),
      }),
    ).toBe(1);
    expect(
      evaluateRatesFormulaWithInputs(
        "recurringScheduleInitialRowCount",
        {
          frequency: frequencyInput("MONTHLY"),
        },
        { current: { scheduleHorizonMonths: 18 } },
      ),
    ).toBe(18);
  });

  it("computes extension row count from existing rows", () => {
    expect(
      evaluateRatesFormulaWithInputs(
        "recurringScheduleExtensionRowCount",
        {
          existingCount: { kind: "literal", value: 10 },
        },
        { current: { scheduleHorizonMonths: 24 } },
      ),
    ).toBe(14);
  });
});

describe("financial item formulas", () => {
  it("maps itemType to balanceSheetRole", () => {
    expect(
      evaluateRatesFormulaWithInputs("balanceSheetRoleFromItemType", {
        itemType: { kind: "literal", value: "MORTGAGE" },
      }),
    ).toBe("LIABILITY");
    expect(
      evaluateRatesFormulaWithInputs("balanceSheetRoleFromItemType", {
        itemType: { kind: "literal", value: "YIELD_SAVINGS" },
      }),
    ).toBe("ASSET");
    expect(
      evaluateRatesFormulaWithInputs("balanceSheetRoleFromItemType", {
        itemType: { kind: "literal", value: "SUBSCRIPTION" },
      }),
    ).toBe("NONE");
  });

  it("sums revolving balance and installment children", () => {
    expect(
      evaluateRatesFormulaWithInputs("cardHostCurrentBalance", {
        revolvingBalance: { kind: "literal", value: 1_000_000 },
        installmentSum: { kind: "literal", value: 22_000_000 },
      }),
    ).toBe(23_000_000);
    expect(
      evaluateRatesFormulaWithInputs("cardHostCurrentBalance", {
        installmentSum: { kind: "literal", value: 5_000_000 },
      }),
    ).toBe(5_000_000);
  });

  it("increments planRevision from current value", () => {
    expect(evaluateRatesFormula("incrementPlanRevision")).toBe(1);
    expect(
      evaluateRatesFormula("incrementPlanRevision", {
        current: { planRevision: 4 },
      }),
    ).toBe(5);
  });

  it("infers flat loan origination date from parent balance trail", () => {
    const inferred = evaluateRatesFormula("inferFlatLoanOriginationDate", {
      current: {
        originalPrincipal: 10_000_000,
        principalPortion: 500_000,
      },
      loaded: {
        parent: {
          currentBalance: 8_500_000,
          nextDueDate: "2026-06-01",
        },
      },
    });
    expect(inferred).toBe("2026-03-01T00:00:00.000Z");
  });
});
