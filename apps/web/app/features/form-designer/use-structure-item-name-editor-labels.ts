import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { StructureItemNameEditorLabels } from "@repo/ui-builder-react";

export function useStructureItemNameEditorLabels(
  defaultName: string,
): StructureItemNameEditorLabels {
  const { t } = useTranslation("common");

  return useMemo(
    () => ({
      label: t("designLayout.structureName.label"),
      placeholder: t("designLayout.structureName.placeholder", {
        defaultName,
      }),
      hint: t("designLayout.structureName.hint"),
    }),
    [defaultName, t],
  );
}
