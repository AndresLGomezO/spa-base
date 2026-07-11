import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { CollapsibleConditionalStylesEditorLabels } from "@repo/ui-builder-react";

import { styleRulesEditorLabels } from "./style-rules-editor-labels";
import { useCustomTokenColorOptions } from "../../theme/use-custom-token-color-options";

export function useConditionalStylesEditorLabels(): {
  readonly title: string;
  readonly defaultHint: string;
  readonly daysRemainingHint: string;
  readonly editor: CollapsibleConditionalStylesEditorLabels;
} {
  const { t } = useTranslation("common");
  const customColorOptions = useCustomTokenColorOptions();
  const styleRules = styleRulesEditorLabels(t, customColorOptions);

  return useMemo(
    () => ({
      title: t("entity.viewSettings.conditionalStyleRules"),
      defaultHint: t("entity.viewSettings.conditionalStyleRulesHint"),
      daysRemainingHint: t("entity.viewSettings.daysRemainingConditionalHint"),
      editor: {
        compareField: t("entity.viewSettings.conditionalStyleCompareField"),
        compareFieldHint: t(
          "entity.viewSettings.conditionalStyleCompareFieldHint",
        ),
        dateDisplayFormat: t("entity.viewSettings.dateDisplayFormat"),
        matchValue: t("entity.viewSettings.matchValue"),
        preview: t("entity.viewSettings.conditionalStylePreview"),
        addRule: t("entity.viewSettings.addRule"),
        saveRule: t("entity.viewSettings.saveConditionalStyleRule"),
        cancel: t("entity.viewSettings.cancel"),
        removeRule: t("entity.viewSettings.remove"),
        stylesWhenMatched: t(
          "entity.viewSettings.conditionalStylesWhenMatched",
        ),
        badgeVariant: t("entity.viewSettings.conditionalStyleBadgeVariant"),
        styleRules,
      },
    }),
    [styleRules, t],
  );
}
