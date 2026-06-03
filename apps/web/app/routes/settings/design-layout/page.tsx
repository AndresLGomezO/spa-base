import { Alert } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { DesignLayoutPageHeader } from "../../../components/design-layout/DesignLayoutPageHeader";
import { DesignLayoutRouteGuard } from "../../../components/design-layout/DesignLayoutRouteGuard";
import type { EntityName } from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import { useRefreshEntityCatalogOnMount } from "../../../entities/use-refresh-entity-catalog-on-mount";
import { EntityPageSkeleton } from "../../../components/loading/EntityPageSkeleton";
import EntityNotFoundRoute from "../../app/entity-not-found";

export default function DesignLayoutPageRoute() {
  const { t } = useTranslation("common");
  const params = useParams();
  const entityName = (params.entityName ?? "") as EntityName;
  const { isKnownEntity, isLoading } = useEntityCatalog();
  useRefreshEntityCatalogOnMount();

  if (isLoading) {
    return <EntityPageSkeleton />;
  }

  if (!isKnownEntity(entityName)) {
    return <EntityNotFoundRoute />;
  }

  return (
    <DesignLayoutRouteGuard title={t("designLayout.pageTitle")}>
      <div className="flex min-h-full flex-col gap-4">
        <DesignLayoutPageHeader
          entityName={entityName}
          title={t("designLayout.pageTitle")}
          description={t("designLayout.pageDescription")}
        />
        <Alert>{t("designLayout.comingSoon")}</Alert>
      </div>
    </DesignLayoutRouteGuard>
  );
}
