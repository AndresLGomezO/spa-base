import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { EntityQueryBuilderView } from "../../features/entity-query-builder/EntityQueryBuilderView";

export default function SettingsQueryBuilderRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();

  const canAccess = usePermission("entityQueryDefinition.read");
  const canCreate = usePermission("entityQueryDefinition.create");
  const canUpdate = usePermission("entityQueryDefinition.update");
  const canDelete = usePermission("entityQueryDefinition.delete");

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canAccess) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("queryBuilder.title")}</Heading>
        <Alert>{t("queryBuilder.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("queryBuilder.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EntityQueryBuilderView
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
