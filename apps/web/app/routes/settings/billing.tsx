import { Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { PermissionGate } from "../../auth/PermissionGate";

export default function SettingsBillingRoute() {
  const { t } = useTranslation("common");

  return (
    <PermissionGate requiredPermission="billing:view">
      <div className="space-y-2">
        <Heading level={1}>{t("nav.billing")}</Heading>
        <Text>{t("settings.billingDescription")}</Text>
      </div>
    </PermissionGate>
  );
}
