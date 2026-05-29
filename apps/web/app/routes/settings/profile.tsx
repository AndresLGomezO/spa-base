import { Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { PermissionGate } from "../../auth/PermissionGate";

export default function SettingsProfileRoute() {
  const { t } = useTranslation("common");

  return (
    <PermissionGate requiredPermission="user:update_self">
      <div className="space-y-2">
        <Heading level={1}>{t("nav.profile")}</Heading>
        <Text>{t("settings.profileDescription")}</Text>
      </div>
    </PermissionGate>
  );
}
