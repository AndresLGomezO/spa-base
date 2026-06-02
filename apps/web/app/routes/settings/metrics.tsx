import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { MetricManager } from "../../components/metrics/MetricManager";

export default function SettingsMetricsRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();

  const canAccess = usePermission("metricDefinition.read");
  const canCreate = usePermission("metricDefinition.create");
  const canUpdate = usePermission("metricDefinition.update");
  const canBackfill = usePermission("metricDefinition.backfill");

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canAccess) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("metrics.title")}</Heading>
        <Alert>{t("metrics.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("metrics.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="shrink-0 space-y-2">
        <Heading level={1}>{t("metrics.title")}</Heading>
        <Text>{t("metrics.description")}</Text>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <MetricManager
          tenantId={tenantId}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canBackfill={canBackfill}
        />
      </div>
    </div>
  );
}
