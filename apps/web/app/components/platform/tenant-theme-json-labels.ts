import type { TFunction } from "i18next";

export interface TenantThemeJsonLabels {
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
  readonly viewDescription: string;
  readonly importDescription: string;
  readonly viewCopy: string;
  readonly viewCopied: string;
  readonly loadExample: string;
}

export function tenantThemeJsonLabels(t: TFunction): TenantThemeJsonLabels {
  return {
    viewTrigger: t("platform.appearance.themeJson.viewTrigger"),
    importTrigger: t("platform.appearance.themeJson.importTrigger"),
    viewTitle: t("platform.appearance.themeJson.viewTitle"),
    importTitle: t("platform.appearance.themeJson.importTitle"),
    pasteLabel: t("platform.appearance.themeJson.pasteLabel"),
    uploadLabel: t("platform.appearance.themeJson.uploadLabel"),
    skeletonTitle: t("platform.appearance.themeJson.skeletonTitle"),
    skeletonShow: t("platform.appearance.themeJson.skeletonShow"),
    skeletonHide: t("platform.appearance.themeJson.skeletonHide"),
    valid: t("platform.appearance.themeJson.valid"),
    invalid: t("platform.appearance.themeJson.invalid"),
    apply: t("platform.appearance.themeJson.apply"),
    cancel: t("platform.appearance.themeJson.cancel"),
    viewDescription: t("platform.appearance.themeJson.viewDescription"),
    importDescription: t("platform.appearance.themeJson.importDescription"),
    viewCopy: t("platform.appearance.themeJson.viewCopy"),
    viewCopied: t("platform.appearance.themeJson.viewCopied"),
    loadExample: t("platform.appearance.themeJson.loadExample"),
  };
}
