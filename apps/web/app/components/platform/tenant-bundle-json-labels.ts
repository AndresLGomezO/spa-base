import type { TFunction } from "i18next";

export interface TenantBundleJsonLabels {
  readonly sectionTitle: string;
  readonly sectionDescription: string;
  readonly viewTrigger: string;
  readonly importTrigger: string;
  readonly viewTitle: string;
  readonly importTitle: string;
  readonly pasteLabel: string;
  readonly uploadLabel: string;
  readonly valid: string;
  readonly invalid: string;
  readonly apply: string;
  readonly cancel: string;
  readonly viewDescription: string;
  readonly importDescription: string;
  readonly viewCopy: string;
  readonly viewCopied: string;
  readonly viewLoading: string;
  readonly viewLoadFailed: string;
  readonly confirmTitle: string;
  readonly confirmDescription: string;
  readonly confirmAction: string;
  readonly importSuccess: string;
  readonly importFailed: string;
}

export function tenantBundleJsonLabels(t: TFunction): TenantBundleJsonLabels {
  return {
    sectionTitle: t("platform.currentTenant.bundle.sectionTitle"),
    sectionDescription: t("platform.currentTenant.bundle.sectionDescription"),
    viewTrigger: t("platform.currentTenant.bundle.viewTrigger"),
    importTrigger: t("platform.currentTenant.bundle.importTrigger"),
    viewTitle: t("platform.currentTenant.bundle.viewTitle"),
    importTitle: t("platform.currentTenant.bundle.importTitle"),
    pasteLabel: t("platform.currentTenant.bundle.pasteLabel"),
    uploadLabel: t("platform.currentTenant.bundle.uploadLabel"),
    valid: t("platform.currentTenant.bundle.valid"),
    invalid: t("platform.currentTenant.bundle.invalid"),
    apply: t("platform.currentTenant.bundle.apply"),
    cancel: t("platform.currentTenant.bundle.cancel"),
    viewDescription: t("platform.currentTenant.bundle.viewDescription"),
    importDescription: t("platform.currentTenant.bundle.importDescription"),
    viewCopy: t("platform.currentTenant.bundle.viewCopy"),
    viewCopied: t("platform.currentTenant.bundle.viewCopied"),
    viewLoading: t("platform.currentTenant.bundle.viewLoading"),
    viewLoadFailed: t("platform.currentTenant.bundle.viewLoadFailed"),
    confirmTitle: t("platform.currentTenant.bundle.confirmTitle"),
    confirmDescription: t("platform.currentTenant.bundle.confirmDescription"),
    confirmAction: t("platform.currentTenant.bundle.confirmAction"),
    importSuccess: t("platform.currentTenant.bundle.importSuccess"),
    importFailed: t("platform.currentTenant.bundle.importFailed"),
  };
}
