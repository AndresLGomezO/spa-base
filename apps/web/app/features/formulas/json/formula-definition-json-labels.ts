import type { TFunction } from "i18next";

interface FormulaDefinitionJsonLabels {
  readonly viewTrigger: string;
  readonly importTrigger: string;
  readonly pasteLabel: string;
  readonly uploadLabel: string;
  readonly skeletonTitle: string;
  readonly skeletonShow: string;
  readonly skeletonHide: string;
  readonly valid: string;
  readonly invalid: string;
  readonly apply: string;
  readonly cancel: string;
  readonly readOnlyHint: string;
  readonly viewDescription: string;
  readonly viewCopy: string;
  readonly viewCopied: string;
}

export interface FormulaDefinitionFormJsonLabels extends FormulaDefinitionJsonLabels {
  readonly viewTitle: string;
  readonly importTitle: string;
  readonly importDescriptionEdit: string;
  readonly nameChangeError: string;
}

export interface FormulaDefinitionsCatalogJsonLabels extends FormulaDefinitionJsonLabels {
  readonly viewTitle: string;
  readonly importTitle: string;
  readonly importDescription: string;
  readonly confirmTitle: string;
  readonly confirmDescription: string;
  readonly confirmAction: string;
  readonly replaceSummary: string;
  readonly importSuccess: string;
  readonly importFailed: string;
}

function sharedLabels(t: TFunction<"common">): FormulaDefinitionJsonLabels {
  return {
    viewTrigger: t("formulas.json.viewTrigger"),
    importTrigger: t("formulas.json.importTrigger"),
    pasteLabel: t("formulas.json.pasteLabel"),
    uploadLabel: t("formulas.json.uploadLabel"),
    skeletonTitle: t("formulas.json.skeletonTitle"),
    skeletonShow: t("formulas.json.skeletonShow"),
    skeletonHide: t("formulas.json.skeletonHide"),
    valid: t("formulas.json.valid"),
    invalid: t("formulas.json.invalid"),
    apply: t("formulas.json.apply"),
    cancel: t("formulas.json.cancel"),
    readOnlyHint: t("formulas.json.readOnlyHint"),
    viewDescription: t("formulas.json.viewDescription"),
    viewCopy: t("formulas.json.viewCopy"),
    viewCopied: t("formulas.json.viewCopied"),
  };
}

export function formulaDefinitionFormJsonLabels(
  t: TFunction<"common">,
): FormulaDefinitionFormJsonLabels {
  return {
    ...sharedLabels(t),
    viewTitle: t("formulas.json.formula.viewTitle"),
    importTitle: t("formulas.json.formula.importTitle"),
    importDescriptionEdit: t("formulas.json.formula.importDescriptionEdit"),
    nameChangeError: t("formulas.json.formula.nameChangeError"),
  };
}

export function formulaDefinitionsCatalogJsonLabels(
  t: TFunction<"common">,
): FormulaDefinitionsCatalogJsonLabels {
  return {
    ...sharedLabels(t),
    viewTitle: t("formulas.json.catalog.viewTitle"),
    importTitle: t("formulas.json.catalog.importTitle"),
    importDescription: t("formulas.json.catalog.importDescription"),
    confirmTitle: t("formulas.json.catalog.confirmTitle"),
    confirmDescription: t("formulas.json.catalog.confirmDescription"),
    confirmAction: t("formulas.json.catalog.confirmAction"),
    replaceSummary: t("formulas.json.catalog.replaceSummary"),
    importSuccess: t("formulas.json.catalog.importSuccess"),
    importFailed: t("formulas.json.catalog.importFailed"),
  };
}
