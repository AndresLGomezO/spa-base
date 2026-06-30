import type { TFunction } from "i18next";

import type { ComponentClickActionEditorLabels } from "@repo/ui-builder-react";

export function componentClickActionEditorLabels(
  t: TFunction<"common">,
): ComponentClickActionEditorLabels {
  return {
    title: t("entity.viewSettings.clickAction.title"),
    actionType: t("entity.viewSettings.clickAction.actionType"),
    none: t("entity.viewSettings.clickAction.none"),
    entityRecord: t("entity.viewSettings.clickAction.entityRecord"),
    externalUrl: t("entity.viewSettings.clickAction.externalUrl"),
    entityTarget: t("entity.viewSettings.clickAction.entityTarget"),
    entityTargetCurrent: t(
      "entity.viewSettings.clickAction.entityTargetCurrent",
    ),
    entityTargetRelation: t(
      "entity.viewSettings.clickAction.entityTargetRelation",
    ),
    relationFieldPath: t("entity.viewSettings.clickAction.relationFieldPath"),
    externalUrlSource: t("entity.viewSettings.clickAction.externalUrlSource"),
    useFieldValue: t("entity.viewSettings.clickAction.useFieldValue"),
    staticUrl: t("entity.viewSettings.clickAction.staticUrl"),
    urlFieldPlaceholder: t(
      "entity.viewSettings.clickAction.urlFieldPlaceholder",
    ),
    staticUrlPlaceholder: t(
      "entity.viewSettings.clickAction.staticUrlPlaceholder",
    ),
    openInNewTab: t("entity.viewSettings.clickAction.openInNewTab"),
  };
}
