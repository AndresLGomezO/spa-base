import type { JsonActionTriggerLabels } from "@repo/ui";
import { useTranslation } from "react-i18next";

export function useJsonActionTriggerLabels(): JsonActionTriggerLabels {
  const { t } = useTranslation("common");

  return {
    group: t("jsonActions.group"),
    view: t("jsonActions.view"),
    import: t("jsonActions.import"),
    viewAriaLabel: t("jsonActions.viewAriaLabel"),
    importAriaLabel: t("jsonActions.importAriaLabel"),
  };
}
