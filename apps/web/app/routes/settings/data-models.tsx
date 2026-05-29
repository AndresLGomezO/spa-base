import { Alert, Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { DataModelManager } from "../../components/data-models/DataModelManager";

export default function SettingsDataModelsRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId, permissions, isSuperAdmin } = useAuth();

  const canAccess =
    isSuperAdmin || permissions.includes("entityDefinition.read");
  const canCreate =
    isSuperAdmin || permissions.includes("entityDefinition.create");

  if (!isReady) {
    return <Text>{t("loading")}</Text>;
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
      <DataModelManager tenantId={tenantId} canCreate={canCreate} />
    </div>
  );
}
