import type { TFunction } from "i18next";
import type { DesignLayoutSurface } from "@repo/entities";

export interface DesignLayoutSliceJsonLabels {
  readonly viewTrigger: string;
  readonly importTrigger: string;
  readonly viewTitle: string;
  readonly importTitle: string;
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
  readonly importDescription: string;
  readonly viewCopy: string;
  readonly viewCopied: string;
}

export interface DesignLayoutFullOverrideJsonLabels {
  readonly viewTrigger: string;
  readonly importTrigger: string;
  readonly viewTitle: string;
  readonly importTitle: string;
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
  readonly importDescription: string;
  readonly viewCopy: string;
  readonly viewCopied: string;
  readonly importSaved: string;
  readonly importFailed: string;
}

function viewTitleForSurface(
  t: TFunction,
  surface: DesignLayoutSurface,
): string {
  switch (surface) {
    case "list":
      return t("designLayout.sliceJson.viewTitle.list");
    case "forms":
      return t("designLayout.sliceJson.viewTitle.forms");
    case "mainPage":
      return t("designLayout.sliceJson.viewTitle.mainPage");
    case "recordDetail":
      return t("designLayout.sliceJson.viewTitle.recordDetail");
    case "metricStrip":
      return t("designLayout.sliceJson.viewTitle.metricStrip");
  }
}

function importTitleForSurface(
  t: TFunction,
  surface: DesignLayoutSurface,
): string {
  switch (surface) {
    case "list":
      return t("designLayout.sliceJson.importTitle.list");
    case "forms":
      return t("designLayout.sliceJson.importTitle.forms");
    case "mainPage":
      return t("designLayout.sliceJson.importTitle.mainPage");
    case "recordDetail":
      return t("designLayout.sliceJson.importTitle.recordDetail");
    case "metricStrip":
      return t("designLayout.sliceJson.importTitle.metricStrip");
  }
}

export function designLayoutSliceJsonLabels(
  t: TFunction,
  surface: DesignLayoutSurface,
): DesignLayoutSliceJsonLabels {
  return {
    viewTrigger: t("designLayout.sliceJson.viewTrigger"),
    importTrigger: t("designLayout.sliceJson.importTrigger"),
    viewTitle: viewTitleForSurface(t, surface),
    importTitle: importTitleForSurface(t, surface),
    pasteLabel: t("designLayout.sliceJson.pasteLabel"),
    uploadLabel: t("designLayout.sliceJson.uploadLabel"),
    skeletonTitle: t("designLayout.sliceJson.skeletonTitle"),
    skeletonShow: t("designLayout.sliceJson.skeletonShow"),
    skeletonHide: t("designLayout.sliceJson.skeletonHide"),
    valid: t("designLayout.sliceJson.valid"),
    invalid: t("designLayout.sliceJson.invalid"),
    apply: t("designLayout.sliceJson.apply"),
    cancel: t("designLayout.sliceJson.cancel"),
    readOnlyHint: t("designLayout.sliceJson.readOnlyHint"),
    viewDescription: t("designLayout.sliceJson.viewDescription"),
    importDescription: t("designLayout.sliceJson.importDescription"),
    viewCopy: t("designLayout.sliceJson.viewCopy"),
    viewCopied: t("designLayout.sliceJson.viewCopied"),
  };
}

export function designLayoutFullOverrideJsonLabels(
  t: TFunction,
): DesignLayoutFullOverrideJsonLabels {
  return {
    viewTrigger: t("designLayout.fullOverrideJson.viewTrigger"),
    importTrigger: t("designLayout.fullOverrideJson.importTrigger"),
    viewTitle: t("designLayout.fullOverrideJson.viewTitle"),
    importTitle: t("designLayout.fullOverrideJson.importTitle"),
    pasteLabel: t("designLayout.fullOverrideJson.pasteLabel"),
    uploadLabel: t("designLayout.fullOverrideJson.uploadLabel"),
    skeletonTitle: t("designLayout.fullOverrideJson.skeletonTitle"),
    skeletonShow: t("designLayout.fullOverrideJson.skeletonShow"),
    skeletonHide: t("designLayout.fullOverrideJson.skeletonHide"),
    valid: t("designLayout.fullOverrideJson.valid"),
    invalid: t("designLayout.fullOverrideJson.invalid"),
    apply: t("designLayout.fullOverrideJson.apply"),
    cancel: t("designLayout.fullOverrideJson.cancel"),
    readOnlyHint: t("designLayout.fullOverrideJson.readOnlyHint"),
    viewDescription: t("designLayout.fullOverrideJson.viewDescription"),
    importDescription: t("designLayout.fullOverrideJson.importDescription"),
    viewCopy: t("designLayout.fullOverrideJson.viewCopy"),
    viewCopied: t("designLayout.fullOverrideJson.viewCopied"),
    importSaved: t("designLayout.fullOverrideJson.importSaved"),
    importFailed: t("designLayout.fullOverrideJson.importFailed"),
  };
}
