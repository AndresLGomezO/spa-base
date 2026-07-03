import type { HookPreviewWidget } from "./hook-preview-types.js";

interface FormulaPreviewDescriptor {
  readonly summaryKey: string;
  readonly widgets?: readonly HookPreviewWidget[];
  readonly detailBulletKeys?: readonly string[];
}

const FORMULA_PREVIEW_CATALOG: Readonly<
  Record<string, FormulaPreviewDescriptor>
> = {
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
  },
  recurringScheduleInitialRowCount: {
    summaryKey: "dataHooks.preview.formulas.recurringScheduleInitialRowCount",
    widgets: [{ type: "rowCountRules", ruleKey: "initial" }],
  },
  recurringScheduleExtensionRowCount: {
    summaryKey: "dataHooks.preview.formulas.recurringScheduleExtensionRowCount",
    widgets: [{ type: "rowCountRules", ruleKey: "extension" }],
  },
  balanceSheetRoleFromItemType: {
    summaryKey: "dataHooks.preview.formulas.balanceSheetRoleFromItemType",
  },
  cardHostCurrentBalance: {
    summaryKey: "dataHooks.preview.formulas.cardHostCurrentBalance",
  },
  incrementPlanRevision: {
    summaryKey: "dataHooks.preview.formulas.incrementPlanRevision",
  },
  inferFlatLoanOriginationDate: {
    summaryKey: "dataHooks.preview.formulas.inferFlatLoanOriginationDate",
  },
  paymentScheduleRowCount: {
    summaryKey: "dataHooks.preview.formulas.paymentScheduleRowCount",
  },
  paymentScheduleDueDate: {
    summaryKey: "dataHooks.preview.formulas.paymentScheduleDueDate",
  },
  scheduleExpectedAmount: {
    summaryKey: "dataHooks.preview.formulas.scheduleExpectedAmount",
  },
  schedulePrincipalPortion: {
    summaryKey: "dataHooks.preview.formulas.schedulePrincipalPortion",
  },
  scheduleInterestPortion: {
    summaryKey: "dataHooks.preview.formulas.scheduleInterestPortion",
  },
  amortizationLoopState: {
    summaryKey: "dataHooks.preview.formulas.amortizationLoopState",
  },
};

export function getFormulaPreviewDescriptor(
  name: string,
): FormulaPreviewDescriptor | undefined {
  return FORMULA_PREVIEW_CATALOG[name];
}

export function humanizeFormulaName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}
