import type { TFunction } from "i18next";
import type { LayoutJsonImportLabels } from "@repo/ui-builder-react";

export function layoutJsonImportLabels(t: TFunction): LayoutJsonImportLabels {
  return {
    trigger: t("designLayout.layoutJsonImport.trigger"),
    titleRoot: t("designLayout.layoutJsonImport.titleRoot"),
    titleComponentRow: t("designLayout.layoutJsonImport.titleComponentRow"),
    titleNestedRow: t("designLayout.layoutJsonImport.titleNestedRow"),
    pasteLabel: t("designLayout.layoutJsonImport.pasteLabel"),
    uploadLabel: t("designLayout.layoutJsonImport.uploadLabel"),
    skeletonTitle: t("designLayout.layoutJsonImport.skeletonTitle"),
    skeletonShow: t("designLayout.layoutJsonImport.skeletonShow"),
    skeletonHide: t("designLayout.layoutJsonImport.skeletonHide"),
    valid: t("designLayout.layoutJsonImport.valid"),
    invalid: t("designLayout.layoutJsonImport.invalid"),
    apply: t("designLayout.layoutJsonImport.apply"),
    cancel: t("designLayout.layoutJsonImport.cancel"),
    readOnlyHint: t("designLayout.layoutJsonImport.readOnlyHint"),
    viewTrigger: t("designLayout.layoutJsonImport.viewTrigger"),
    viewTitleRoot: t("designLayout.layoutJsonImport.viewTitleRoot"),
    viewTitleComponentRow: t(
      "designLayout.layoutJsonImport.viewTitleComponentRow",
    ),
    viewTitleNestedRow: t("designLayout.layoutJsonImport.viewTitleNestedRow"),
    viewDescription: t("designLayout.layoutJsonImport.viewDescription"),
    viewCopy: t("designLayout.layoutJsonImport.viewCopy"),
    viewCopied: t("designLayout.layoutJsonImport.viewCopied"),
  };
}
