import type { TFunction } from "i18next";

import type { ComponentConfigEditorLabels } from "@repo/ui-builder-react";

export function formDesignerComponentEditorLabels(
  t: TFunction<"common">,
): ComponentConfigEditorLabels {
  return {
    component: t("entity.viewSettings.component"),
    staticValue: t("entity.viewSettings.staticValue"),
    field: t("entity.viewSettings.field"),
    fallbacks: t("entity.viewSettings.fallbacks"),
    remove: t("entity.viewSettings.remove"),
    addFallback: t("entity.viewSettings.addFallback"),
    slotSettings: t("entity.viewSettings.slotSettings"),
    componentStyles: t("entity.viewSettings.componentStyles"),
    badgeColorRules: t("entity.viewSettings.badgeColorRules"),
    matchValue: t("entity.viewSettings.matchValue"),
    addRule: t("entity.viewSettings.addRule"),
    imageSize: t("entity.viewSettings.imageSize"),
    dateDisplayFormat: t("entity.viewSettings.dateDisplayFormat"),
    displayFormat: t("entity.viewSettings.displayFormat"),
    showCurrency: t("entity.viewSettings.showCurrency"),
    showToneColors: t("entity.viewSettings.showToneColors"),
    entityFieldSelectorLayout: t(
      "entity.viewSettings.entityFieldSelectorLayout",
    ),
    entityFieldSelectorLayoutList: t(
      "entity.viewSettings.entityFieldSelectorLayoutList",
    ),
    entityFieldSelectorLayoutListWithLogo: t(
      "entity.viewSettings.entityFieldSelectorLayoutListWithLogo",
    ),
    entityFieldSelectorLayoutMiniCards: t(
      "entity.viewSettings.entityFieldSelectorLayoutMiniCards",
    ),
    entityFieldSelectorEnableSearch: t(
      "entity.viewSettings.entityFieldSelectorEnableSearch",
    ),
    entityFieldSelectorCardsPerRow: t(
      "entity.viewSettings.entityFieldSelectorCardsPerRow",
    ),
    entityFieldSelectorImageField: t(
      "entity.viewSettings.entityFieldSelectorImageField",
    ),
    entityFieldSelectorImageFieldAuto: t(
      "entity.viewSettings.entityFieldSelectorImageFieldAuto",
    ),
    entityFieldSelectorEnumLayoutHint: t(
      "entity.viewSettings.entityFieldSelectorEnumLayoutHint",
    ),
    booleanFieldDisplay: t("entity.viewSettings.booleanFieldDisplay"),
    booleanFieldDisplayCheckbox: t(
      "entity.viewSettings.booleanFieldDisplayCheckbox",
    ),
    booleanFieldDisplaySwitch: t(
      "entity.viewSettings.booleanFieldDisplaySwitch",
    ),
    booleanFieldSwitchVariant: t(
      "entity.viewSettings.booleanFieldSwitchVariant",
    ),
    booleanFieldSwitchVariantIos: t(
      "entity.viewSettings.booleanFieldSwitchVariantIos",
    ),
    booleanFieldSwitchVariantSquared: t(
      "entity.viewSettings.booleanFieldSwitchVariantSquared",
    ),
    booleanFieldSwitchWidth: t("entity.viewSettings.booleanFieldSwitchWidth"),
    booleanFieldSwitchHeight: t("entity.viewSettings.booleanFieldSwitchHeight"),
    textFieldMultiline: t("entity.viewSettings.textFieldMultiline"),
    textFieldMultilineRows: t("entity.viewSettings.textFieldMultilineRows"),
    formFieldHideLabel: t("entity.viewSettings.formFieldHideLabel"),
    iconName: t("designLayout.iconName"),
    iconSize: t("entity.viewSettings.imageSize"),
    iconNameHint: t("designLayout.iconNameHint"),
    styleRules: {
      addStyleRule: t("entity.viewSettings.addStyleRule"),
      removeStyleRule: t("entity.viewSettings.removeStyleRule"),
      styleProperty: t("entity.viewSettings.styleProperty"),
      styleValue: t("entity.viewSettings.styleValue"),
      styleColorTheme: t("entity.viewSettings.styleColorTheme"),
      styleColorCustom: t("entity.viewSettings.styleColorCustom"),
      styleColorThemeTokens: t("entity.viewSettings.styleColorThemeTokens"),
      styleColorSemanticTokens: t(
        "entity.viewSettings.styleColorSemanticTokens",
      ),
      styleColorCustomInput: t("entity.viewSettings.styleColorCustomInput"),
      styleColorInvalid: t("entity.viewSettings.styleColorInvalid"),
    },
    label: {
      showLabel: t("entity.viewSettings.showLabel"),
      label: t("entity.viewSettings.label"),
      labelPosition: t("entity.viewSettings.labelPosition"),
      labelAbove: t("entity.viewSettings.labelAbove"),
      labelBelow: t("entity.viewSettings.labelBelow"),
      labelAlignLeft: t("entity.viewSettings.labelAlignLeft"),
      labelAlignCenter: t("entity.viewSettings.labelAlignCenter"),
      labelAlignRight: t("entity.viewSettings.labelAlignRight"),
      labelColor: t("entity.viewSettings.labelColor"),
    },
  };
}
