import type { TFunction } from "i18next";

interface MetricDefinitionJsonLabels {
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

export interface MetricDefinitionFormJsonLabels extends MetricDefinitionJsonLabels {
  readonly viewTitle: string;
  readonly importTitle: string;
  readonly importDescriptionCreate: string;
  readonly importDescriptionEdit: string;
  readonly nameChangeError: string;
}

export interface MetricDefinitionsCatalogJsonLabels extends MetricDefinitionJsonLabels {
  readonly viewTitle: string;
  readonly importTitle: string;
  readonly importDescription: string;
  readonly confirmTitle: string;
  readonly confirmDescription: string;
  readonly confirmAction: string;
  readonly replaceSummary: string;
  readonly backfillSummary: string;
  readonly importSuccess: string;
  readonly importFailed: string;
}

function sharedLabels(t: TFunction): MetricDefinitionJsonLabels {
  return {
    viewTrigger: t("metrics.json.viewTrigger"),
    importTrigger: t("metrics.json.importTrigger"),
    pasteLabel: t("metrics.json.pasteLabel"),
    uploadLabel: t("metrics.json.uploadLabel"),
    skeletonTitle: t("metrics.json.skeletonTitle"),
    skeletonShow: t("metrics.json.skeletonShow"),
    skeletonHide: t("metrics.json.skeletonHide"),
    valid: t("metrics.json.valid"),
    invalid: t("metrics.json.invalid"),
    apply: t("metrics.json.apply"),
    cancel: t("metrics.json.cancel"),
    readOnlyHint: t("metrics.json.readOnlyHint"),
    viewDescription: t("metrics.json.viewDescription"),
    viewCopy: t("metrics.json.viewCopy"),
    viewCopied: t("metrics.json.viewCopied"),
  };
}

export function metricDefinitionFormJsonLabels(
  t: TFunction,
): MetricDefinitionFormJsonLabels {
  return {
    ...sharedLabels(t),
    viewTitle: t("metrics.json.metric.viewTitle"),
    importTitle: t("metrics.json.metric.importTitle"),
    importDescriptionCreate: t("metrics.json.metric.importDescriptionCreate"),
    importDescriptionEdit: t("metrics.json.metric.importDescriptionEdit"),
    nameChangeError: t("metrics.json.metric.nameChangeError"),
  };
}

export function metricDefinitionsCatalogJsonLabels(
  t: TFunction,
): MetricDefinitionsCatalogJsonLabels {
  return {
    ...sharedLabels(t),
    viewTitle: t("metrics.json.catalog.viewTitle"),
    importTitle: t("metrics.json.catalog.importTitle"),
    importDescription: t("metrics.json.catalog.importDescription"),
    confirmTitle: t("metrics.json.catalog.confirmTitle"),
    confirmDescription: t("metrics.json.catalog.confirmDescription"),
    confirmAction: t("metrics.json.catalog.confirmAction"),
    replaceSummary: t("metrics.json.catalog.replaceSummary"),
    backfillSummary: t("metrics.json.catalog.backfillSummary"),
    importSuccess: t("metrics.json.catalog.importSuccess"),
    importFailed: t("metrics.json.catalog.importFailed"),
  };
}
