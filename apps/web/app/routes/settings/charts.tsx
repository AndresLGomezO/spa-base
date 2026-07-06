import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { ChartsView } from "../../features/charts-builder/ChartsView";

export default function SettingsChartsRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();

  const canAccess = usePermission("chartDefinition.read");
  const canCreate = usePermission("chartDefinition.create");
  const canUpdate = usePermission("chartDefinition.update");

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canAccess) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("charts.title")}</Heading>
        <Alert>{t("charts.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("charts.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChartsView canCreate={canCreate} canUpdate={canUpdate} />
    </div>
  );
}
