import { Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

export default function SettingsTeamRoute() {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-2">
      <Heading level={1}>{t("nav.team")}</Heading>
      <Text>{t("settings.teamDescription")}</Text>
    </div>
  );
}
