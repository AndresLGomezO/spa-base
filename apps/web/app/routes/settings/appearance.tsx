import { Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { TenantAppearanceEditor } from "../../components/platform/TenantAppearanceEditor";

export default function SettingsAppearanceRoute() {
  const { t } = useTranslation("common");
  const { tenantId } = useAuth();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Heading level={1}>{t("platform.appearance.title")}</Heading>
        <Text>{t("platform.appearance.description")}</Text>
      </div>
      {!tenantId ? (
        <Text>{t("tenant.selectDescription")}</Text>
      ) : (
        <TenantAppearanceEditor tenantId={tenantId} />
      )}
    </div>
  );
}
