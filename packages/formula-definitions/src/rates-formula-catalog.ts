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
  inputRef,
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
      "Loan: schedule anchor — prefer parent nextDueDate (mid-loan / after payment); else origination",
      ifExpr(
        unary("!", call("isEmpty", fieldParent("nextDueDate"))),
        fieldParent("nextDueDate"),
        formulaRef("loanOriginationDate"),
      ),
    ),
    tenant(
      "loanCoalescePrincipal",
      "Loan: coalesce(originalPrincipal, parent.currentBalance)",
      coalesce(
        fieldCurrent("originalPrincipal"),
        fieldParent("currentBalance"),
      ),
    ),
    tenant(
      "loanBasePrincipal",
      "Loan: opening principal — currentBalance when anchored on nextDueDate; else originalPrincipal",
      ifExpr(
        unary("!", call("isEmpty", fieldParent("nextDueDate"))),
        coalesce(
          fieldParent("currentBalance"),
          coalesce(
            fieldCurrent("originalPrincipal"),
            fieldParent("currentBalance"),
          ),
        ),
        coalesce(
          fieldCurrent("originalPrincipal"),
          fieldParent("currentBalance"),
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
      "loanGermanRemainingTermMonths",
      "Loan: GERMAN remaining periods including current row",
      call(
        "max",
        lit(1),
        binary("-", formulaRef("loanTermMonths"), varRef("loopIndex")),
      ),
    ),
    tenant(
      "loanGermanUsesStatementAmount",
      "Loan: GERMAN mid-loan first row uses parent statement amount",
      binary(
        "&&",
        call("isEmpty", formulaRef("loanOriginationDate")),
        binary(
          "&&",
          binary("==", varRef("loopIndex"), lit(0)),
          unary("!", call("isEmpty", fieldParent("amount"))),
        ),
      ),
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
            then: ifExpr(
              formulaRef("loanGermanUsesStatementAmount"),
              binary(
                "-",
                fieldParent("amount"),
                formulaRef("loanInterestPayment"),
              ),
              binary(
                "/",
                formulaRef("loanPeriodBalance"),
                formulaRef("loanGermanRemainingTermMonths"),
              ),
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
          {
            when: lit("GERMAN"),
            then: ifExpr(
              formulaRef("loanGermanUsesStatementAmount"),
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
    binary("*", fieldParent("currentBalance"), formulaRef("loanMonthlyRate")),
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
              call(
                "ln",
                binary("/", loanAnnuityPaymentRef, frenchPaymentDenominator),
              ),
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
            // Full term from origination only when nextDueDate is absent (brand-new loan).
            // Mid-loan / after-payment replan anchors on nextDueDate and uses remaining rows.
            binary(
              "&&",
              call("isEmpty", fieldParent("nextDueDate")),
              unary("!", call("isEmpty", formulaRef("loanOriginationDate"))),
            ),
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

const LIABILITY_ITEM_TYPES = [
  "MORTGAGE",
  "LOAN",
  "CREDIT_CARD",
  "REVOLVING_CREDIT",
  "PERSONAL_DEBT",
] as const;

const ASSET_ITEM_TYPES = [
  "SCHEDULED_SAVINGS",
  "YIELD_SAVINGS",
  "FIDUCIARY",
  "INVESTMENT_FUND",
  "OTHER_INVESTMENT",
] as const;

function frequencyStepMultiplierBody(): PortableFormulaDefinition["body"] {
  return switchExpr(
    inputRef("frequency"),
    [
      { when: lit("WEEKLY"), then: lit(1) },
      { when: lit("BIWEEKLY"), then: lit(2) },
      { when: lit("MONTHLY"), then: lit(1) },
      { when: lit("QUARTERLY"), then: lit(3) },
      { when: lit("ANNUAL"), then: lit(1) },
    ],
    lit(1),
  );
}

function frequencyUnitBody(): PortableFormulaDefinition["body"] {
  return switchExpr(
    inputRef("frequency"),
    [
      { when: lit("WEEKLY"), then: lit("WEEK") },
      { when: lit("BIWEEKLY"), then: lit("WEEK") },
      { when: lit("MONTHLY"), then: lit("MONTH") },
      { when: lit("QUARTERLY"), then: lit("MONTH") },
      { when: lit("ANNUAL"), then: lit("YEAR") },
    ],
    lit("MONTH"),
  );
}

function buildRatesRecurringScheduleFormulas(): readonly PortableFormulaDefinition[] {
  const frequencyInput = { name: "frequency", required: true };

  return [
    tenant(
      "frequencyStepMultiplier",
      "Recurring schedule: period step multiplier by frequency",
      frequencyStepMultiplierBody(),
      [frequencyInput],
    ),
    tenant(
      "frequencyUnit",
      "Recurring schedule: dateAdd unit by frequency",
      frequencyUnitBody(),
      [frequencyInput],
    ),
    tenant(
      "frequencyDueDate",
      "Recurring schedule: due date from base date, frequency, and period index (YYYY-MM-DD)",
      call(
        "dateOnly",
        call(
          "dateAdd",
          inputRef("baseDate"),
          inputRef("periodIndex"),
          formulaRef("frequencyUnit", { frequency: inputRef("frequency") }),
        ),
      ),
      [
        { name: "baseDate", required: true },
        frequencyInput,
        { name: "periodIndex", required: true },
      ],
    ),
    tenant(
      "frequencyScheduleDueDate",
      "Recurring schedule: batch row due date (loopIndex * step multiplier)",
      formulaRef("frequencyDueDate", {
        baseDate: inputRef("baseDate"),
        frequency: inputRef("frequency"),
        periodIndex: binary(
          "*",
          varRef("loopIndex"),
          formulaRef("frequencyStepMultiplier", {
            frequency: inputRef("frequency"),
          }),
        ),
      }),
      [{ name: "baseDate", required: true }, frequencyInput],
    ),
    tenant(
      "frequencyAdvanceDueDate",
      "Recurring schedule: single-step roll-forward due date",
      formulaRef("frequencyDueDate", {
        baseDate: inputRef("baseDate"),
        frequency: inputRef("frequency"),
        periodIndex: formulaRef("frequencyStepMultiplier", {
          frequency: inputRef("frequency"),
        }),
      }),
      [{ name: "baseDate", required: true }, frequencyInput],
    ),
    tenant(
      "scheduleHorizonOrDefault",
      "Recurring schedule: coalesce(scheduleHorizonMonths, 12)",
      coalesce(fieldCurrent("scheduleHorizonMonths"), lit(12)),
    ),
    tenant(
      "recurringScheduleInitialRowCount",
      "Recurring schedule: initial createRecords count",
      ifExpr(
        binary("==", inputRef("frequency"), lit("ONE_TIME")),
        lit(1),
        call("min", formulaRef("scheduleHorizonOrDefault"), lit(1000)),
      ),
      [frequencyInput],
    ),
    tenant(
      "recurringScheduleExtensionRowCount",
      "Recurring schedule: monthly horizon extension row count",
      call(
        "min",
        lit(100),
        binary(
          "-",
          formulaRef("scheduleHorizonOrDefault"),
          inputRef("existingCount"),
        ),
      ),
      [{ name: "existingCount", required: true }],
    ),
  ];
}

function buildRatesFinancialItemFormulas(): readonly PortableFormulaDefinition[] {
  return [
    tenant(
      "balanceSheetRoleFromItemType",
      "Financial item: map itemType to balanceSheetRole",
      switchExpr(
        inputRef("itemType"),
        [
          ...LIABILITY_ITEM_TYPES.map((itemType) => ({
            when: lit(itemType),
            then: lit("LIABILITY"),
          })),
          ...ASSET_ITEM_TYPES.map((itemType) => ({
            when: lit(itemType),
            then: lit("ASSET"),
          })),
        ],
        lit("NONE"),
      ),
      [{ name: "itemType", required: true }],
    ),
    tenant(
      "cardHostCurrentBalance",
      "Credit card: host currentBalance from revolving + installment sum",
      binary(
        "+",
        coalesce(inputRef("revolvingBalance"), lit(0)),
        coalesce(inputRef("installmentSum"), lit(0)),
      ),
      [
        { name: "revolvingBalance", required: false },
        { name: "installmentSum", required: true },
      ],
    ),
    tenant(
      "incrementPlanRevision",
      "Loan: bump planRevision by one",
      binary("+", coalesce(fieldCurrent("planRevision"), lit(0)), lit(1)),
    ),
    tenant(
      "inferFlatLoanOriginationDate",
      "Loan: infer originationDate for flat/NONE amortization plans",
      ifExpr(
        binary(
          "&&",
          binary(
            "&&",
            binary(
              "&&",
              unary("!", call("isEmpty", fieldCurrent("originalPrincipal"))),
              unary("!", call("isEmpty", fieldParent("currentBalance"))),
            ),
            binary(
              "&&",
              unary("!", call("isEmpty", fieldCurrent("principalPortion"))),
              binary(">", fieldCurrent("principalPortion"), lit(0)),
            ),
          ),
          unary("!", call("isEmpty", fieldParent("nextDueDate"))),
        ),
        call(
          "dateAdd",
          fieldParent("nextDueDate"),
          unary(
            "-",
            call(
              "floor",
              binary(
                "/",
                binary(
                  "-",
                  fieldCurrent("originalPrincipal"),
                  fieldParent("currentBalance"),
                ),
                fieldCurrent("principalPortion"),
              ),
            ),
          ),
          lit("MONTH"),
        ),
        fieldCurrent("originationDate"),
      ),
    ),
  ];
}

export function buildRatesFormulaDefinitions(
  utilities: readonly PortableFormulaDefinition[],
): readonly PortableFormulaDefinition[] {
  return [
    ...utilities,
    ...buildRatesLoanFormulas(),
    ...buildRatesScheduleFormulas(),
    ...buildRatesRecurringScheduleFormulas(),
    ...buildRatesFinancialItemFormulas(),
  ];
}

export const RATES_LOAN_FORMULA_NAMES = buildRatesLoanFormulas().map(
  (formula) => formula.name,
);
