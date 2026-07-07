import type { TFunction } from "i18next";

interface EntityQueryDefinitionJsonLabels {
  readonly viewTrigger: string;
  readonly importTrigger: string;
  readonly pasteLabel: string;
  readonly uploadLabel: string;
  readonly skeletonTitle: string;
  readonly skeletonShow: string;
  readonly skeletonHide: string;
  readonly fillExample: string;
  readonly valid: string;
  readonly invalid: string;
  readonly apply: string;
  readonly cancel: string;
  readonly readOnlyHint: string;
  readonly viewDescription: string;
  readonly viewCopy: string;
  readonly viewCopied: string;
}

export interface EntityQueryDefinitionFormJsonLabels extends EntityQueryDefinitionJsonLabels {
  readonly viewTitle: string;
  readonly importTitle: string;
  readonly importDescriptionEdit: string;
  readonly identityPreservedNotice: string;
  readonly nameChangeError: string;
  readonly sourceEntityChangeError: string;
}

export interface EntityQueryDefinitionsCatalogJsonLabels extends EntityQueryDefinitionJsonLabels {
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

function sharedLabels(t: TFunction): EntityQueryDefinitionJsonLabels {
  return {
    viewTrigger: t("queryBuilder.json.viewTrigger"),
    importTrigger: t("queryBuilder.json.importTrigger"),
    pasteLabel: t("queryBuilder.json.pasteLabel"),
    uploadLabel: t("queryBuilder.json.uploadLabel"),
    skeletonTitle: t("queryBuilder.json.skeletonTitle"),
    skeletonShow: t("queryBuilder.json.skeletonShow"),
    skeletonHide: t("queryBuilder.json.skeletonHide"),
    fillExample: t("queryBuilder.json.fillExample"),
    valid: t("queryBuilder.json.valid"),
    invalid: t("queryBuilder.json.invalid"),
    apply: t("queryBuilder.json.apply"),
    cancel: t("queryBuilder.json.cancel"),
    readOnlyHint: t("queryBuilder.json.readOnlyHint"),
    viewDescription: t("queryBuilder.json.viewDescription"),
    viewCopy: t("queryBuilder.json.viewCopy"),
    viewCopied: t("queryBuilder.json.viewCopied"),
  };
}

export function entityQueryDefinitionFormJsonLabels(
  t: TFunction,
): EntityQueryDefinitionFormJsonLabels {
  return {
    ...sharedLabels(t),
    viewTitle: t("queryBuilder.json.query.viewTitle"),
    importTitle: t("queryBuilder.json.query.importTitle"),
    importDescriptionEdit: t("queryBuilder.json.query.importDescriptionEdit"),
    identityPreservedNotice: t(
      "queryBuilder.json.query.identityPreservedNotice",
    ),
    nameChangeError: t("queryBuilder.json.query.nameChangeError"),
    sourceEntityChangeError: t(
      "queryBuilder.json.query.sourceEntityChangeError",
    ),
  };
}

export function entityQueryDefinitionsCatalogJsonLabels(
  t: TFunction,
): EntityQueryDefinitionsCatalogJsonLabels {
  return {
    ...sharedLabels(t),
    viewTitle: t("queryBuilder.json.catalog.viewTitle"),
    importTitle: t("queryBuilder.json.catalog.importTitle"),
    importDescription: t("queryBuilder.json.catalog.importDescription"),
    confirmTitle: t("queryBuilder.json.catalog.confirmTitle"),
    confirmDescription: t("queryBuilder.json.catalog.confirmDescription"),
    confirmAction: t("queryBuilder.json.catalog.confirmAction"),
    replaceSummary: t("queryBuilder.json.catalog.replaceSummary"),
    importSuccess: t("queryBuilder.json.catalog.importSuccess"),
    importFailed: t("queryBuilder.json.catalog.importFailed"),
  };
}
