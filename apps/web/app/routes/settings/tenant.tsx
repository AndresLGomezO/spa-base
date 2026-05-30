import { Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { CurrentTenantPanel } from "../../components/platform/CurrentTenantPanel";

export default function SettingsTenantRoute() {
  const { t } = useTranslation("common");
  const { tenantId } = useAuth();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Heading level={1}>{t("platform.currentTenant.title")}</Heading>
        <Text>{t("platform.currentTenant.description")}</Text>
      </div>
      {!tenantId ? (
        <Text>{t("tenant.selectDescription")}</Text>
      ) : (
        <CurrentTenantPanel tenantId={tenantId} />
      )}
    </div>
  );
}
