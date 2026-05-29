import { Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { PermissionGate } from "../../auth/PermissionGate";

export default function SettingsTeamRoute() {
  const { t } = useTranslation("common");

  return (
    <PermissionGate requiredPermission="team:view">
      <div className="space-y-2">
        <Heading level={1}>{t("nav.team")}</Heading>
        <Text>{t("settings.teamDescription")}</Text>
      </div>
    </PermissionGate>
  );
}
