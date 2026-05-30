import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { DataModelManager } from "../../components/data-models/DataModelManager";

export default function SettingsDataModelsRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();

  const canAccess = usePermission("entityDefinition.read");
  const canCreate = usePermission("entityDefinition.create");
  const canUpdate = usePermission("entityDefinition.update");

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canAccess) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("dataModels.title")}</Heading>
        <Alert>{t("dataModels.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("dataModels.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Heading level={1}>{t("dataModels.title")}</Heading>
        <Text>{t("dataModels.description")}</Text>
      </div>
      <DataModelManager
        tenantId={tenantId}
        canCreate={canCreate}
        canUpdate={canUpdate}
      />
    </div>
  );
}
