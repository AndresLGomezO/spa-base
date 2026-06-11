import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

export function FormDesignerLayoutTabPlaceholder() {
  const { t } = useTranslation("common");

  return (
    <Text className="text-muted-foreground text-sm">
      {t("formDesigner.tabs.layoutTabPlaceholder")}
    </Text>
  );
}

export function FormDesignerComponentsTabPlaceholder() {
  const { t } = useTranslation("common");

  return (
    <Text className="text-muted-foreground text-sm">
      {t("formDesigner.tabs.componentsTabPlaceholder")}
    </Text>
  );
}
