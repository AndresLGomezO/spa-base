import type { TFunction } from "i18next";

import type { SemanticColorOption } from "@repo/ui-builder-react";

export function styleRulesEditorLabels(
  t: TFunction<"common">,
  customColorOptions: readonly SemanticColorOption[] = [],
) {
  return {
    addStyleRule: t("entity.viewSettings.addStyleRule"),
    saveStyleRule: t("entity.viewSettings.save"),
    removeStyleRule: t("entity.viewSettings.removeStyleRule"),
    styleProperty: t("entity.viewSettings.styleProperty"),
    styleValue: t("entity.viewSettings.styleValue"),
    styleColorTheme: t("entity.viewSettings.styleColorTheme"),
    styleColorCustom: t("entity.viewSettings.styleColorCustom"),
    styleColorThemeTokens: t("entity.viewSettings.styleColorThemeTokens"),
    styleColorSemanticTokens: t("entity.viewSettings.styleColorSemanticTokens"),
    styleColorPaletteTokens: t("entity.viewSettings.styleColorPaletteTokens"),
    styleColorEffects: t("entity.viewSettings.styleColorEffects"),
    styleColorSidebar: t("entity.viewSettings.styleColorSidebar"),
    styleColorBadge: t("entity.viewSettings.styleColorBadge"),
    styleColorCustomTokens: t("entity.viewSettings.styleColorCustomTokens"),
    styleColorCustomInput: t("entity.viewSettings.styleColorCustomInput"),
    styleColorInvalid: t("entity.viewSettings.styleColorInvalid"),
    styleShadowTheme: t("entity.viewSettings.styleShadowTheme"),
    styleShadowCustom: t("entity.viewSettings.styleShadowCustom"),
    styleShadowShortcuts: t("entity.viewSettings.styleShadowShortcuts"),
    styleShadowVars: t("entity.viewSettings.styleShadowVars"),
    styleShadowCustomInput: t("entity.viewSettings.styleShadowCustomInput"),
    styleShadowInvalid: t("entity.viewSettings.styleShadowInvalid"),
    styleDimensionTheme: t("entity.viewSettings.styleDimensionTheme"),
    styleDimensionCustom: t("entity.viewSettings.styleDimensionCustom"),
    styleDimensionTokens: t("entity.viewSettings.styleDimensionTokens"),
    styleDimensionCustomInput: t(
      "entity.viewSettings.styleDimensionCustomInput",
    ),
    styleDimensionInvalid: t("entity.viewSettings.styleDimensionInvalid"),
    styleTypographyTheme: t("entity.viewSettings.styleTypographyTheme"),
    styleTypographyCustom: t("entity.viewSettings.styleTypographyCustom"),
    styleTypographyTokens: t("entity.viewSettings.styleTypographyTokens"),
    styleTypographyCustomInput: t(
      "entity.viewSettings.styleTypographyCustomInput",
    ),
    styleTypographyInvalid: t("entity.viewSettings.styleTypographyInvalid"),
    customColorOptions,
  };
}
