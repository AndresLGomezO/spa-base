import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import type { EntityName } from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useRefreshEntityCatalogOnMount } from "../../entities/use-refresh-entity-catalog-on-mount";
import { DataHooksView } from "../../features/data-hooks/DataHooksView";
import EntityNotFoundRoute from "../app/entity-not-found";

export default function SettingsAutomationRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();
  const params = useParams();
  const entityName = (params.entityName ?? "") as EntityName;
  const { isKnownEntity, isLoading } = useEntityCatalog();
  useRefreshEntityCatalogOnMount();

  const canAccess = usePermission("hook.read");
  const canCreate = usePermission("hook.create");
  const canUpdate = usePermission("hook.update");
  const canDelete = usePermission("hook.delete");

  if (!isReady || isLoading) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canAccess) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("dataHooks.navTitle")}</Heading>
        <Alert>{t("dataHooks.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("dataHooks.navTitle")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  if (!isKnownEntity(entityName)) {
    return <EntityNotFoundRoute />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataHooksView
        entityName={entityName}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
