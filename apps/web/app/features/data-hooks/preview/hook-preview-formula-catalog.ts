import type { HookPreviewWidget } from "./hook-preview-types.js";

interface FormulaPreviewDescriptor {
  readonly summaryKey: string;
  readonly widgets?: readonly HookPreviewWidget[];
  readonly detailBulletKeys?: readonly string[];
}

const FORMULA_PREVIEW_CATALOG: Readonly<
  Record<string, FormulaPreviewDescriptor>
> = {
  annuityPayment: {
    summaryKey: "dataHooks.preview.formulas.annuityPayment",
    detailBulletKeys: [
      "dataHooks.preview.formulas.annuityPaymentDetail1",
      "dataHooks.preview.formulas.annuityPaymentDetail2",
    ],
  },
  simpleInterest: {
    summaryKey: "dataHooks.preview.formulas.simpleInterest",
    detailBulletKeys: ["dataHooks.preview.formulas.simpleInterestDetail1"],
  },
  monthlyRateFromQuote: {
    summaryKey: "dataHooks.preview.formulas.monthlyRateFromQuote",
    detailBulletKeys: [
      "dataHooks.preview.formulas.monthlyRateFromQuoteDetail1",
      "dataHooks.preview.formulas.monthlyRateFromQuoteDetail2",
    ],
  },
  scheduleAnchorDate: {
    summaryKey: "dataHooks.preview.formulas.scheduleAnchorDate",
    detailBulletKeys: ["dataHooks.preview.formulas.scheduleAnchorDateDetail1"],
  },
  loanOriginationDate: {
    summaryKey: "dataHooks.preview.formulas.loanOriginationDate",
    detailBulletKeys: ["dataHooks.preview.formulas.loanOriginationDateDetail1"],
  },
  loanScheduleAnchorDate: {
    summaryKey: "dataHooks.preview.formulas.loanScheduleAnchorDate",
    detailBulletKeys: [
      "dataHooks.preview.formulas.loanScheduleAnchorDateDetail1",
    ],
  },
  loanCoalescePrincipal: {
    summaryKey: "dataHooks.preview.formulas.loanCoalescePrincipal",
    detailBulletKeys: [
      "dataHooks.preview.formulas.loanCoalescePrincipalDetail1",
    ],
  },
  loanBasePrincipal: {
    summaryKey: "dataHooks.preview.formulas.loanBasePrincipal",
    detailBulletKeys: ["dataHooks.preview.formulas.loanBasePrincipalDetail1"],
  },
  loanPeriodBalance: {
    summaryKey: "dataHooks.preview.formulas.loanPeriodBalance",
    detailBulletKeys: ["dataHooks.preview.formulas.loanPeriodBalanceDetail1"],
  },
  loanTermMonths: {
    summaryKey: "dataHooks.preview.formulas.loanTermMonths",
    detailBulletKeys: ["dataHooks.preview.formulas.loanTermMonthsDetail1"],
  },
  loanGermanRemainingTermMonths: {
    summaryKey: "dataHooks.preview.formulas.loanGermanRemainingTermMonths",
    detailBulletKeys: [
      "dataHooks.preview.formulas.loanGermanRemainingTermMonthsDetail1",
    ],
  },
  loanGermanUsesStatementAmount: {
    summaryKey: "dataHooks.preview.formulas.loanGermanUsesStatementAmount",
    detailBulletKeys: [
      "dataHooks.preview.formulas.loanGermanUsesStatementAmountDetail1",
    ],
  },
  loanIsLastPeriod: {
    summaryKey: "dataHooks.preview.formulas.loanIsLastPeriod",
    detailBulletKeys: ["dataHooks.preview.formulas.loanIsLastPeriodDetail1"],
  },
  loanMonthlyRate: {
    summaryKey: "dataHooks.preview.formulas.loanMonthlyRate",
    detailBulletKeys: [
      "dataHooks.preview.formulas.loanMonthlyRateDetail1",
      "dataHooks.preview.formulas.loanMonthlyRateDetail2",
    ],
  },
  loanAnnuityPayment: {
    summaryKey: "dataHooks.preview.formulas.loanAnnuityPayment",
    detailBulletKeys: [
      "dataHooks.preview.formulas.loanAnnuityPaymentDetail1",
      "dataHooks.preview.formulas.loanAnnuityPaymentDetail2",
    ],
  },
  loanInterestPayment: {
    summaryKey: "dataHooks.preview.formulas.loanInterestPayment",
    detailBulletKeys: ["dataHooks.preview.formulas.loanInterestPaymentDetail1"],
  },
  loanPrincipalPayment: {
    summaryKey: "dataHooks.preview.formulas.loanPrincipalPayment",
    detailBulletKeys: [
      "dataHooks.preview.formulas.loanPrincipalPaymentDetail1",
      "dataHooks.preview.formulas.loanPrincipalPaymentDetail2",
    ],
  },
  schedulePrincipalPortion: {
    summaryKey: "dataHooks.preview.formulas.schedulePrincipalPortion",
    detailBulletKeys: [
      "dataHooks.preview.formulas.schedulePrincipalPortionDetail1",
    ],
  },
  scheduleInterestPortion: {
    summaryKey: "dataHooks.preview.formulas.scheduleInterestPortion",
    detailBulletKeys: [
      "dataHooks.preview.formulas.scheduleInterestPortionDetail1",
    ],
  },
  scheduleExpectedAmount: {
    summaryKey: "dataHooks.preview.formulas.scheduleExpectedAmount",
    detailBulletKeys: [
      "dataHooks.preview.formulas.scheduleExpectedAmountDetail1",
    ],
  },
  amortizationLoopState: {
    summaryKey: "dataHooks.preview.formulas.amortizationLoopState",
    detailBulletKeys: [
      "dataHooks.preview.formulas.amortizationLoopStateDetail1",
    ],
  },
  paymentScheduleFrenchRowCount: {
    summaryKey: "dataHooks.preview.formulas.paymentScheduleFrenchRowCount",
    widgets: [{ type: "rowCountRules", ruleKey: "initial" }],
    detailBulletKeys: [
      "dataHooks.preview.formulas.paymentScheduleFrenchRowCountDetail1",
    ],
  },
  paymentScheduleAmortizedRowCount: {
    summaryKey: "dataHooks.preview.formulas.paymentScheduleAmortizedRowCount",
    detailBulletKeys: [
      "dataHooks.preview.formulas.paymentScheduleAmortizedRowCountDetail1",
    ],
  },
  paymentScheduleRowCount: {
    summaryKey: "dataHooks.preview.formulas.paymentScheduleRowCount",
    widgets: [{ type: "rowCountRules", ruleKey: "initial" }],
    detailBulletKeys: [
      "dataHooks.preview.formulas.paymentScheduleRowCountDetail1",
    ],
  },
  paymentScheduleDueDate: {
    summaryKey: "dataHooks.preview.formulas.paymentScheduleDueDate",
    detailBulletKeys: [
      "dataHooks.preview.formulas.paymentScheduleDueDateDetail1",
    ],
  },
  frequencyStepMultiplier: {
    summaryKey: "dataHooks.preview.formulas.frequencyStepMultiplier",
    widgets: [{ type: "frequencyTable" }],
    detailBulletKeys: [
      "dataHooks.preview.formulas.frequencyStepMultiplierDetail1",
    ],
  },
  frequencyUnit: {
    summaryKey: "dataHooks.preview.formulas.frequencyUnit",
    widgets: [{ type: "frequencyTable" }],
    detailBulletKeys: ["dataHooks.preview.formulas.frequencyUnitDetail1"],
  },
  frequencyDueDate: {
    summaryKey: "dataHooks.preview.formulas.frequencyDueDate",
    widgets: [{ type: "frequencyTable" }],
    detailBulletKeys: [
      "dataHooks.preview.formulas.frequencyDueDateDetail1",
      "dataHooks.preview.formulas.frequencyDueDateDetail2",
    ],
  },
  frequencyScheduleDueDate: {
    summaryKey: "dataHooks.preview.formulas.frequencyScheduleDueDate",
    widgets: [{ type: "frequencyTable" }],
    detailBulletKeys: [
      "dataHooks.preview.formulas.frequencyScheduleDueDateDetail1",
      "dataHooks.preview.formulas.frequencyScheduleDueDateDetail2",
    ],
  },
  frequencyAdvanceDueDate: {
    summaryKey: "dataHooks.preview.formulas.frequencyAdvanceDueDate",
    widgets: [{ type: "frequencyTable" }],
    detailBulletKeys: [
      "dataHooks.preview.formulas.frequencyAdvanceDueDateDetail1",
    ],
  },
  scheduleHorizonOrDefault: {
    summaryKey: "dataHooks.preview.formulas.scheduleHorizonOrDefault",
    detailBulletKeys: [
      "dataHooks.preview.formulas.scheduleHorizonOrDefaultDetail1",
    ],
  },
  recurringScheduleInitialRowCount: {
    summaryKey: "dataHooks.preview.formulas.recurringScheduleInitialRowCount",
    widgets: [{ type: "rowCountRules", ruleKey: "initial" }],
    detailBulletKeys: [
      "dataHooks.preview.formulas.recurringScheduleInitialRowCountDetail1",
    ],
  },
  recurringScheduleExtensionRowCount: {
    summaryKey: "dataHooks.preview.formulas.recurringScheduleExtensionRowCount",
    widgets: [{ type: "rowCountRules", ruleKey: "extension" }],
    detailBulletKeys: [
      "dataHooks.preview.formulas.recurringScheduleExtensionRowCountDetail1",
    ],
  },
  balanceSheetRoleFromItemType: {
    summaryKey: "dataHooks.preview.formulas.balanceSheetRoleFromItemType",
    detailBulletKeys: [
      "dataHooks.preview.formulas.balanceSheetRoleFromItemTypeDetail1",
    ],
  },
  cardHostCurrentBalance: {
    summaryKey: "dataHooks.preview.formulas.cardHostCurrentBalance",
    detailBulletKeys: [
      "dataHooks.preview.formulas.cardHostCurrentBalanceDetail1",
    ],
  },
  incrementPlanRevision: {
    summaryKey: "dataHooks.preview.formulas.incrementPlanRevision",
    detailBulletKeys: [
      "dataHooks.preview.formulas.incrementPlanRevisionDetail1",
    ],
  },
  inferFlatLoanOriginationDate: {
    summaryKey: "dataHooks.preview.formulas.inferFlatLoanOriginationDate",
    detailBulletKeys: [
      "dataHooks.preview.formulas.inferFlatLoanOriginationDateDetail1",
    ],
  },
};

export function getFormulaPreviewDescriptor(
  name: string,
): FormulaPreviewDescriptor | undefined {
  return FORMULA_PREVIEW_CATALOG[name];
}

export function listFormulaPreviewCatalogNames(): readonly string[] {
  return Object.keys(FORMULA_PREVIEW_CATALOG);
}

export function humanizeFormulaName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}
