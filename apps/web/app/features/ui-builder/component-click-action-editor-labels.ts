import type { TFunction } from "i18next";

import type { ComponentClickActionEditorLabels } from "@repo/ui-builder-react";

export function componentClickActionEditorLabels(
  t: TFunction<"common">,
): ComponentClickActionEditorLabels {
  return {
    title: t("entity.viewSettings.clickAction.title"),
    actionType: t("entity.viewSettings.clickAction.actionType"),
    none: t("entity.viewSettings.clickAction.none"),
    entityNavigation: t("entity.viewSettings.clickAction.entityNavigation"),
    externalUrl: t("entity.viewSettings.clickAction.externalUrl"),
    navigationDestination: t(
      "entity.viewSettings.clickAction.navigationDestination",
    ),
    destinationRecordDetail: t(
      "entity.viewSettings.clickAction.destinationRecordDetail",
    ),
    destinationRecordEditForm: t(
      "entity.viewSettings.clickAction.destinationRecordEditForm",
    ),
    destinationEntityList: t(
      "entity.viewSettings.clickAction.destinationEntityList",
    ),
    destinationCreateForm: t(
      "entity.viewSettings.clickAction.destinationCreateForm",
    ),
    entityTarget: t("entity.viewSettings.clickAction.entityTarget"),
    entityTargetCurrent: t(
      "entity.viewSettings.clickAction.entityTargetCurrent",
    ),
    entityTargetRelation: t(
      "entity.viewSettings.clickAction.entityTargetRelation",
    ),
    entityTargetSpecific: t(
      "entity.viewSettings.clickAction.entityTargetSpecific",
    ),
    relationFieldPath: t("entity.viewSettings.clickAction.relationFieldPath"),
    specificEntity: t("entity.viewSettings.clickAction.specificEntity"),
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
    noRelationFields: t("entity.viewSettings.clickAction.noRelationFields"),
    formDesign: t("entity.viewSettings.clickAction.formDesign"),
    formDesignDefault: t("entity.viewSettings.clickAction.formDesignDefault"),
    createFormPrefill: t("entity.viewSettings.clickAction.createFormPrefill"),
    createFormPrefillTargetField: t(
      "entity.viewSettings.clickAction.createFormPrefillTargetField",
    ),
    createFormPrefillSource: t(
      "entity.viewSettings.clickAction.createFormPrefillSource",
    ),
    createFormPrefillSourceField: t(
      "entity.viewSettings.clickAction.createFormPrefillSourceField",
    ),
    createFormPrefillSourceFieldValue: t(
      "entity.viewSettings.clickAction.createFormPrefillSourceFieldValue",
    ),
    createFormPrefillSourceCurrentDate: t(
      "entity.viewSettings.clickAction.createFormPrefillSourceCurrentDate",
    ),
    createFormPrefillSourceEnumValue: t(
      "entity.viewSettings.clickAction.createFormPrefillSourceEnumValue",
    ),
    createFormPrefillEnumValue: t(
      "entity.viewSettings.clickAction.createFormPrefillEnumValue",
    ),
    addCreateFormPrefill: t(
      "entity.viewSettings.clickAction.addCreateFormPrefill",
    ),
    removeCreateFormPrefill: t(
      "entity.viewSettings.clickAction.removeCreateFormPrefill",
    ),
    noCreateFormPrefillTargetFields: t(
      "entity.viewSettings.clickAction.noCreateFormPrefillTargetFields",
    ),
  };
}
