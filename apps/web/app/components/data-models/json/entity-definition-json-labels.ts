import type { TFunction } from "i18next";

interface EntityDefinitionJsonLabels {
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

export interface FieldDefinitionJsonLabels extends EntityDefinitionJsonLabels {
  readonly viewTitle: string;
  readonly importTitle: string;
  readonly importDescription: string;
}

export interface EntityDefinitionFormJsonLabels extends EntityDefinitionJsonLabels {
  readonly viewTitle: string;
  readonly importTitle: string;
  readonly importDescriptionCreate: string;
  readonly importDescriptionEdit: string;
  readonly nameChangeError: string;
}

export interface EntityDefinitionsCatalogJsonLabels extends EntityDefinitionJsonLabels {
  readonly viewTitle: string;
  readonly importTitle: string;
  readonly importDescription: string;
  readonly confirmTitle: string;
  readonly confirmDescription: string;
  readonly confirmAction: string;
  readonly replaceSummary: string;
  readonly categoryReplaceSummary: string;
  readonly importSuccess: string;
  readonly importFailed: string;
}

function sharedLabels(t: TFunction): EntityDefinitionJsonLabels {
  return {
    viewTrigger: t("dataModels.json.viewTrigger"),
    importTrigger: t("dataModels.json.importTrigger"),
    pasteLabel: t("dataModels.json.pasteLabel"),
    uploadLabel: t("dataModels.json.uploadLabel"),
    skeletonTitle: t("dataModels.json.skeletonTitle"),
    skeletonShow: t("dataModels.json.skeletonShow"),
    skeletonHide: t("dataModels.json.skeletonHide"),
    valid: t("dataModels.json.valid"),
    invalid: t("dataModels.json.invalid"),
    apply: t("dataModels.json.apply"),
    cancel: t("dataModels.json.cancel"),
    readOnlyHint: t("dataModels.json.readOnlyHint"),
    viewDescription: t("dataModels.json.viewDescription"),
    viewCopy: t("dataModels.json.viewCopy"),
    viewCopied: t("dataModels.json.viewCopied"),
  };
}

export function fieldDefinitionJsonLabels(
  t: TFunction,
): FieldDefinitionJsonLabels {
  return {
    ...sharedLabels(t),
    viewTitle: t("dataModels.json.field.viewTitle"),
    importTitle: t("dataModels.json.field.importTitle"),
    importDescription: t("dataModels.json.field.importDescription"),
  };
}

export function entityDefinitionFormJsonLabels(
  t: TFunction,
): EntityDefinitionFormJsonLabels {
  return {
    ...sharedLabels(t),
    viewTitle: t("dataModels.json.entity.viewTitle"),
    importTitle: t("dataModels.json.entity.importTitle"),
    importDescriptionCreate: t(
      "dataModels.json.entity.importDescriptionCreate",
    ),
    importDescriptionEdit: t("dataModels.json.entity.importDescriptionEdit"),
    nameChangeError: t("dataModels.json.entity.nameChangeError"),
  };
}

export function entityDefinitionsCatalogJsonLabels(
  t: TFunction,
): EntityDefinitionsCatalogJsonLabels {
  return {
    ...sharedLabels(t),
    viewTitle: t("dataModels.json.catalog.viewTitle"),
    importTitle: t("dataModels.json.catalog.importTitle"),
    importDescription: t("dataModels.json.catalog.importDescription"),
    confirmTitle: t("dataModels.json.catalog.confirmTitle"),
    confirmDescription: t("dataModels.json.catalog.confirmDescription"),
    confirmAction: t("dataModels.json.catalog.confirmAction"),
    replaceSummary: t("dataModels.json.catalog.replaceSummary"),
    categoryReplaceSummary: t("dataModels.json.catalog.categoryReplaceSummary"),
    importSuccess: t("dataModels.json.catalog.importSuccess"),
    importFailed: t("dataModels.json.catalog.importFailed"),
  };
}
