import { Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

export default function SettingsProfileRoute() {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-2">
      <Heading level={1}>{t("nav.profile")}</Heading>
      <Text>{t("settings.profileDescription")}</Text>
    </div>
  );
}
