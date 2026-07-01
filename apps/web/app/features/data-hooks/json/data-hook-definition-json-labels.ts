import type { TFunction } from "i18next";

interface DataHookDefinitionJsonLabels {
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

export interface DataHooksCatalogJsonLabels extends DataHookDefinitionJsonLabels {
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

function sharedLabels(t: TFunction<"common">): DataHookDefinitionJsonLabels {
  return {
    viewTrigger: t("dataHooks.catalog.viewTrigger"),
    importTrigger: t("dataHooks.catalog.importTrigger"),
    pasteLabel: t("dataHooks.catalog.pasteLabel"),
    uploadLabel: t("dataHooks.catalog.uploadLabel"),
    skeletonTitle: t("dataHooks.catalog.skeletonTitle"),
    skeletonShow: t("dataHooks.catalog.skeletonShow"),
    skeletonHide: t("dataHooks.catalog.skeletonHide"),
    valid: t("dataHooks.catalog.valid"),
    invalid: t("dataHooks.catalog.invalid"),
    apply: t("dataHooks.catalog.apply"),
    cancel: t("dataHooks.cancel"),
    readOnlyHint: t("dataHooks.catalog.readOnlyHint"),
    viewDescription: t("dataHooks.catalog.viewDescription"),
    viewCopy: t("dataHooks.catalog.viewCopy"),
    viewCopied: t("dataHooks.catalog.viewCopied"),
  };
}

export function dataHooksCatalogJsonLabels(
  t: TFunction<"common">,
): DataHooksCatalogJsonLabels {
  return {
    ...sharedLabels(t),
    viewTitle: t("dataHooks.catalog.viewTitle"),
    importTitle: t("dataHooks.catalog.importTitle"),
    importDescription: t("dataHooks.catalog.importDescription"),
    confirmTitle: t("dataHooks.catalog.confirmTitle"),
    confirmDescription: t("dataHooks.catalog.confirmDescription"),
    confirmAction: t("dataHooks.catalog.confirmAction"),
    replaceSummary: t("dataHooks.catalog.replaceSummary"),
    importSuccess: t("dataHooks.catalog.importSuccess"),
    importFailed: t("dataHooks.catalog.importFailed"),
  };
}
