import type { PortableFormulaDefinition } from "./types.js";
import {
  amortizationType,
  binary,
  call,
  coalesce,
  fieldCurrent,
  fieldParent,
  fieldTerms,
  formulaRef,
  ifExpr,
  lit,
  switchExpr,
  tenantAnnuityPaymentCall,
  unary,
  varRef,
} from "./rates-formula-nodes.js";

function tenant(
  name: string,
  description: string,
  body: PortableFormulaDefinition["body"],
  inputs: PortableFormulaDefinition["inputs"] = [],
): PortableFormulaDefinition {
  return {
    name,
    description,
    inputs,
    body,
    enabled: true,
    source: "tenant",
  };
}

function layer1Formulas(): readonly PortableFormulaDefinition[] {
  return [
    tenant(
      "loanOriginationDate",
      "Loan: coalesced origination date (terms or current loanDetails)",
      coalesce(fieldTerms("originationDate"), fieldCurrent("originationDate")),
    ),
    tenant(
      "loanScheduleAnchorDate",
      "Loan: schedule anchor date (origination or parent next due)",
      ifExpr(
        unary("!", call("isEmpty", formulaRef("loanOriginationDate"))),
        formulaRef("loanOriginationDate"),
        fieldParent("nextDueDate"),
      ),
    ),
    tenant(
      "loanCoalescePrincipal",
      "Loan: coalesce(originalPrincipal, parent.currentBalance)",
      coalesce(fieldCurrent("originalPrincipal"), fieldParent("currentBalance")),
    ),
    tenant(
      "loanBasePrincipal",
      "Loan: opening principal resolved from origination anchor",
      ifExpr(
        unary("!", call("isEmpty", formulaRef("loanOriginationDate"))),
        coalesce(
          fieldCurrent("originalPrincipal"),
          fieldParent("currentBalance"),
        ),
        coalesce(
          fieldParent("currentBalance"),
          coalesce(
            fieldCurrent("originalPrincipal"),
            fieldParent("currentBalance"),
          ),
        ),
      ),
    ),
    tenant(
      "loanPeriodBalance",
      "Loan: period opening balance (coalesce loopState, base principal)",
      coalesce(varRef("loopState"), formulaRef("loanBasePrincipal")),
    ),
    tenant(
      "loanTermMonths",
      "Loan: term length in months",
      coalesce(fieldCurrent("termMonths"), lit(12)),
    ),
    tenant(
      "loanIsLastPeriod",
      "Loan: true when loopIndex is on the final period",
      binary(
        ">=",
        varRef("loopIndex"),
        binary("-", formulaRef("loanTermMonths"), lit(1)),
      ),
    ),
    tenant(
      "loanMonthlyRate",
      "Loan: monthly decimal rate from current quote fields",
      formulaRef("monthlyRateFromQuote", {
        rate: fieldCurrent("interestRate"),
        quote: fieldCurrent("interestRateQuote"),
      }),
    ),
  ];
}

function layer2Formulas(): readonly PortableFormulaDefinition[] {
  return [
    tenant(
      "loanAnnuityPayment",
      "Loan: French annuity payment amount",
      coalesce(fieldParent("amount"), tenantAnnuityPaymentCall()),
    ),
    tenant(
      "loanInterestPayment",
      "Loan: interest portion by amortization strategy",
      switchExpr(
        amortizationType(),
        [
          {
            when: lit("NONE"),
            then: coalesce(fieldCurrent("interestPortion"), lit(0)),
          },
        ],
        formulaRef("simpleInterest", {
          amount: formulaRef("loanPeriodBalance"),
          rate: formulaRef("loanMonthlyRate"),
        }),
      ),
    ),
    tenant(
      "loanPrincipalPayment",
      "Loan: principal portion by amortization strategy",
      switchExpr(
        amortizationType(),
        [
          {
            when: lit("NONE"),
            then: coalesce(fieldCurrent("principalPortion"), lit(0)),
          },
          {
            when: lit("GERMAN"),
            then: binary(
              "/",
              formulaRef("loanPeriodBalance"),
              formulaRef("loanTermMonths"),
            ),
          },
          {
            when: lit("AMERICAN"),
            then: ifExpr(
              formulaRef("loanIsLastPeriod"),
              formulaRef("loanPeriodBalance"),
              lit(0),
            ),
          },
          {
            when: lit("BULLET"),
            then: ifExpr(
              formulaRef("loanIsLastPeriod"),
              formulaRef("loanPeriodBalance"),
              lit(0),
            ),
          },
        ],
        binary(
          "-",
          formulaRef("loanAnnuityPayment"),
          formulaRef("loanInterestPayment"),
        ),
      ),
    ),
  ];
}

function layer3Formulas(): readonly PortableFormulaDefinition[] {
  return [
    tenant(
      "schedulePrincipalPortion",
      "Schedule: principal portion for payment row",
      formulaRef("loanPrincipalPayment"),
    ),
    tenant(
      "scheduleInterestPortion",
      "Schedule: interest portion for payment row",
      formulaRef("loanInterestPayment"),
    ),
    tenant(
      "scheduleExpectedAmount",
      "Schedule: expected payment amount for row",
      switchExpr(
        amortizationType(),
        [
          {
            when: lit("NONE"),
            then: coalesce(
              fieldParent("amount"),
              binary(
                "+",
                formulaRef("loanPrincipalPayment"),
                formulaRef("loanInterestPayment"),
              ),
            ),
          },
        ],
        binary(
          "+",
          formulaRef("loanPrincipalPayment"),
          formulaRef("loanInterestPayment"),
        ),
      ),
    ),
    tenant(
      "amortizationLoopState",
      "Schedule: remaining balance after principal payment",
      binary(
        "-",
        formulaRef("loanPeriodBalance"),
        formulaRef("schedulePrincipalPortion"),
      ),
    ),
  ];
}

export function buildRatesLoanFormulas(): readonly PortableFormulaDefinition[] {
  return [...layer1Formulas(), ...layer2Formulas(), ...layer3Formulas()];
}

function scheduleFormulas(): readonly PortableFormulaDefinition[] {
  const loanAnnuityPaymentRef = formulaRef("loanAnnuityPayment");
  const frenchPaymentDenominator = binary(
    "-",
    loanAnnuityPaymentRef,
    binary(
      "*",
      fieldParent("currentBalance"),
      formulaRef("loanMonthlyRate"),
    ),
  );

  return [
    tenant(
      "paymentScheduleFrenchRowCount",
      "Schedule: French amortization row count",
      call(
        "max",
        lit(1),
        call(
          "min",
          formulaRef("loanTermMonths"),
          call(
            "ceil",
            binary(
              "/",
              call("ln", binary("/", loanAnnuityPaymentRef, frenchPaymentDenominator)),
              call("ln", binary("+", lit(1), formulaRef("loanMonthlyRate"))),
            ),
          ),
        ),
      ),
    ),
    tenant(
      "paymentScheduleAmortizedRowCount",
      "Schedule: amortized row count by type",
      switchExpr(
        amortizationType(),
        [
          {
            when: lit("GERMAN"),
            then: call("max", lit(1), formulaRef("loanTermMonths")),
          },
        ],
        formulaRef("paymentScheduleFrenchRowCount"),
      ),
    ),
    tenant(
      "paymentScheduleRowCount",
      "Schedule: payment row count",
      ifExpr(
        binary(
          "||",
          binary(
            "&&",
            binary("!=", amortizationType(), lit("NONE")),
            binary(
              "||",
              call("isEmpty", fieldCurrent("interestRate")),
              binary(
                "||",
                call("isEmpty", fieldCurrent("termMonths")),
                call("isEmpty", formulaRef("loanCoalescePrincipal")),
              ),
            ),
          ),
          binary(
            "&&",
            call("isEmpty", formulaRef("loanOriginationDate")),
            binary(
              "||",
              call("isEmpty", fieldParent("currentBalance")),
              call("isEmpty", fieldParent("amount")),
            ),
          ),
        ),
        lit(0),
        ifExpr(
          call("isEmpty", formulaRef("loanScheduleAnchorDate")),
          lit(0),
          ifExpr(
            unary("!", call("isEmpty", formulaRef("loanOriginationDate"))),
            call("max", lit(1), formulaRef("loanTermMonths")),
            formulaRef("paymentScheduleAmortizedRowCount"),
          ),
        ),
      ),
    ),
    tenant(
      "paymentScheduleDueDate",
      "Schedule: payment due date for row",
      call(
        "dateAdd",
        formulaRef("loanScheduleAnchorDate"),
        varRef("loopIndex"),
        lit("MONTH"),
      ),
    ),
  ];
}

export function buildRatesScheduleFormulas(): readonly PortableFormulaDefinition[] {
  return scheduleFormulas();
}

export function buildRatesFormulaDefinitions(
  utilities: readonly PortableFormulaDefinition[],
): readonly PortableFormulaDefinition[] {
  return [
    ...utilities,
    ...buildRatesLoanFormulas(),
    ...buildRatesScheduleFormulas(),
  ];
}

export const RATES_LOAN_FORMULA_NAMES = buildRatesLoanFormulas().map(
  (formula) => formula.name,
);
