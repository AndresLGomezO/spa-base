import type { TFunction } from "i18next";

interface CustomViewDefinitionJsonLabels {
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

export interface CustomViewDefinitionFormJsonLabels extends CustomViewDefinitionJsonLabels {
  readonly viewTitle: string;
  readonly importTitle: string;
  readonly importDescriptionCreate: string;
  readonly importDescriptionEdit: string;
  readonly viewIdChangeError: string;
  readonly queryNameChangeError: string;
}

export interface CustomViewsCatalogJsonLabels extends CustomViewDefinitionJsonLabels {
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

function sharedLabels(t: TFunction): CustomViewDefinitionJsonLabels {
  return {
    viewTrigger: t("customViews.json.viewTrigger"),
    importTrigger: t("customViews.json.importTrigger"),
    pasteLabel: t("customViews.json.pasteLabel"),
    uploadLabel: t("customViews.json.uploadLabel"),
    skeletonTitle: t("customViews.json.skeletonTitle"),
    skeletonShow: t("customViews.json.skeletonShow"),
    skeletonHide: t("customViews.json.skeletonHide"),
    valid: t("customViews.json.valid"),
    invalid: t("customViews.json.invalid"),
    apply: t("customViews.json.apply"),
    cancel: t("customViews.json.cancel"),
    readOnlyHint: t("customViews.json.readOnlyHint"),
    viewDescription: t("customViews.json.viewDescription"),
    viewCopy: t("customViews.json.viewCopy"),
    viewCopied: t("customViews.json.viewCopied"),
  };
}

export function customViewDefinitionFormJsonLabels(
  t: TFunction,
): CustomViewDefinitionFormJsonLabels {
  return {
    ...sharedLabels(t),
    viewTitle: t("customViews.json.view.viewTitle"),
    importTitle: t("customViews.json.view.importTitle"),
    importDescriptionCreate: t("customViews.json.view.importDescriptionCreate"),
    importDescriptionEdit: t("customViews.json.view.importDescriptionEdit"),
    viewIdChangeError: t("customViews.json.view.viewIdChangeError"),
    queryNameChangeError: t("customViews.json.view.queryNameChangeError"),
  };
}

export function customViewsCatalogJsonLabels(
  t: TFunction,
): CustomViewsCatalogJsonLabels {
  return {
    ...sharedLabels(t),
    viewTitle: t("customViews.json.catalog.viewTitle"),
    importTitle: t("customViews.json.catalog.importTitle"),
    importDescription: t("customViews.json.catalog.importDescription"),
    confirmTitle: t("customViews.json.catalog.confirmTitle"),
    confirmDescription: t("customViews.json.catalog.confirmDescription"),
    confirmAction: t("customViews.json.catalog.confirmAction"),
    replaceSummary: t("customViews.json.catalog.replaceSummary"),
    importSuccess: t("customViews.json.catalog.importSuccess"),
    importFailed: t("customViews.json.catalog.importFailed"),
  };
}
