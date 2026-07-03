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

export interface DataHookDefinitionFormJsonLabels extends DataHookDefinitionJsonLabels {
  readonly viewTitle: string;
  readonly importTitle: string;
  readonly importDescriptionEdit: string;
  readonly nameChangeError: string;
  readonly entityChangeError: string;
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
    viewTrigger: t("dataHooks.json.viewTrigger"),
    importTrigger: t("dataHooks.json.importTrigger"),
    pasteLabel: t("dataHooks.json.pasteLabel"),
    uploadLabel: t("dataHooks.json.uploadLabel"),
    skeletonTitle: t("dataHooks.json.skeletonTitle"),
    skeletonShow: t("dataHooks.json.skeletonShow"),
    skeletonHide: t("dataHooks.json.skeletonHide"),
    valid: t("dataHooks.json.valid"),
    invalid: t("dataHooks.json.invalid"),
    apply: t("dataHooks.json.apply"),
    cancel: t("dataHooks.json.cancel"),
    readOnlyHint: t("dataHooks.json.readOnlyHint"),
    viewDescription: t("dataHooks.json.viewDescription"),
    viewCopy: t("dataHooks.json.viewCopy"),
    viewCopied: t("dataHooks.json.viewCopied"),
  };
}

export function dataHookDefinitionFormJsonLabels(
  t: TFunction<"common">,
): DataHookDefinitionFormJsonLabels {
  return {
    ...sharedLabels(t),
    viewTitle: t("dataHooks.json.hook.viewTitle"),
    importTitle: t("dataHooks.json.hook.importTitle"),
    importDescriptionEdit: t("dataHooks.json.hook.importDescriptionEdit"),
    nameChangeError: t("dataHooks.json.hook.nameChangeError"),
    entityChangeError: t("dataHooks.json.hook.entityChangeError"),
  };
}

export function dataHooksCatalogJsonLabels(
  t: TFunction<"common">,
): DataHooksCatalogJsonLabels {
  return {
    ...sharedLabels(t),
    viewTitle: t("dataHooks.json.catalog.viewTitle"),
    importTitle: t("dataHooks.json.catalog.importTitle"),
    importDescription: t("dataHooks.json.catalog.importDescription"),
    confirmTitle: t("dataHooks.json.catalog.confirmTitle"),
    confirmDescription: t("dataHooks.json.catalog.confirmDescription"),
    confirmAction: t("dataHooks.json.catalog.confirmAction"),
    replaceSummary: t("dataHooks.json.catalog.replaceSummary"),
    importSuccess: t("dataHooks.json.catalog.importSuccess"),
    importFailed: t("dataHooks.json.catalog.importFailed"),
  };
}
