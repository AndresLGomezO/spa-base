import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type {
  ComponentConfigEditorLabels,
  SemanticColorOption,
} from "@repo/ui-builder-react";

import { useCustomTokenColorOptions } from "../../theme/use-custom-token-color-options";
import { styleRulesEditorLabels } from "../ui-builder/style-rules-editor-labels";

export function formDesignerComponentEditorLabels(
  t: TFunction<"common">,
  customColorOptions: readonly SemanticColorOption[] = [],
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
    conditionalStyleRules: t("entity.viewSettings.conditionalStyleRules"),
    conditionalStyleRulesHint: t("entity.viewSettings.conditionalStyleRulesHint"),
    daysRemainingConditionalHint: t(
      "entity.viewSettings.daysRemainingConditionalHint",
    ),
    conditionalStyleBackgroundColor: t(
      "entity.viewSettings.conditionalStyleBackgroundColor",
    ),
    conditionalStyleTextColor: t("entity.viewSettings.conditionalStyleTextColor"),
    conditionalStyleBadgeVariant: t(
      "entity.viewSettings.conditionalStyleBadgeVariant",
    ),
    matchValue: t("entity.viewSettings.matchValue"),
    addRule: t("entity.viewSettings.addRule"),
    imageSize: t("entity.viewSettings.imageSize"),
    imageDisplayMode: t("entity.viewSettings.imageDisplayMode"),
    imageDisplayModeInline: t("entity.viewSettings.imageDisplayModeInline"),
    imageDisplayModeOverlay: t("entity.viewSettings.imageDisplayModeOverlay"),
    imageObjectFit: t("entity.viewSettings.imageObjectFit"),
    imageObjectFitContain: t("entity.viewSettings.imageObjectFitContain"),
    imageObjectFitCover: t("entity.viewSettings.imageObjectFitCover"),
    imageObjectFitFill: t("entity.viewSettings.imageObjectFitFill"),
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
    formFieldHidden: t("entity.viewSettings.formFieldHidden"),
    iconName: t("designLayout.iconName"),
    iconSize: t("entity.viewSettings.imageSize"),
    iconNameHint: t("designLayout.iconNameHint"),
    wizardProgressVariant: t(
      "formDesigner.components.options.wizardProgressVariant",
    ),
    wizardProgressVariantSteps: t(
      "formDesigner.components.options.wizardProgressVariantSteps",
    ),
    wizardProgressVariantBar: t(
      "formDesigner.components.options.wizardProgressVariantBar",
    ),
    wizardProgressVariantStepper: t(
      "formDesigner.components.options.wizardProgressVariantStepper",
    ),
    wizardProgressBarTrackColor: t(
      "formDesigner.components.options.wizardProgressBarTrackColor",
    ),
    wizardProgressBarFillColor: t(
      "formDesigner.components.options.wizardProgressBarFillColor",
    ),
    wizardStepLabel: {
      showLabel: t("entity.viewSettings.showLabel"),
      labelPosition: t(
        "formDesigner.components.options.wizardStepLabelPosition",
      ),
      labelTop: t("formDesigner.components.options.wizardStepLabelTop"),
      labelBottom: t("formDesigner.components.options.wizardStepLabelBottom"),
      labelLeft: t("formDesigner.components.options.wizardStepLabelLeft"),
      labelRight: t("formDesigner.components.options.wizardStepLabelRight"),
      labelHidden: t("formDesigner.components.options.wizardStepLabelHidden"),
      labelAlignLeft: t("entity.viewSettings.labelAlignLeft"),
      labelAlignCenter: t("entity.viewSettings.labelAlignCenter"),
      labelAlignRight: t("entity.viewSettings.labelAlignRight"),
      labelAlignment: t(
        "formDesigner.components.options.wizardStepLabelAlignment",
      ),
      labelColor: t("entity.viewSettings.labelColor"),
      labelFontWeight: t(
        "formDesigner.components.options.wizardStepLabelFontWeight",
      ),
      labelFontDefault: t(
        "formDesigner.components.options.wizardStepLabelFontDefault",
      ),
      labelFontBold: t(
        "formDesigner.components.options.wizardStepLabelFontBold",
      ),
      labelFontThin: t(
        "formDesigner.components.options.wizardStepLabelFontThin",
      ),
      labelFontNormal: t(
        "formDesigner.components.options.wizardStepLabelFontNormal",
      ),
      labelItalic: t("formDesigner.components.options.wizardStepLabelItalic"),
      labelUnderline: t(
        "formDesigner.components.options.wizardStepLabelUnderline",
      ),
      labelFontSize: t(
        "formDesigner.components.options.wizardStepLabelFontSize",
      ),
    },
    wizardStepperLayout: {
      stepSpacing: t(
        "formDesigner.components.options.wizardStepperStepSpacing",
      ),
      circleSize: t("formDesigner.components.options.wizardStepperCircleSize"),
      labelMaxWidth: t(
        "formDesigner.components.options.wizardStepperLabelMaxWidth",
      ),
    },
    styleRules: styleRulesEditorLabels(t, customColorOptions),
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

export function useFormDesignerComponentEditorLabels(): ComponentConfigEditorLabels {
  const { t } = useTranslation("common");
  const customColorOptions = useCustomTokenColorOptions();
  return useMemo(
    () => formDesignerComponentEditorLabels(t, customColorOptions),
    [customColorOptions, t],
  );
}
