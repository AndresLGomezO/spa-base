import { useTranslation } from "react-i18next";

import { DesignLayoutEntityRedirect } from "../../../components/design-layout/DesignLayoutEntityRedirect";
import { DesignLayoutRouteGuard } from "../../../components/design-layout/DesignLayoutRouteGuard";
import { useDesignLayoutSearchTarget } from "../../../components/design-layout/use-design-layout-search-target";
import { EntityPageSkeleton } from "../../../components/loading/EntityPageSkeleton";
import type { EntityName } from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import { useRefreshEntityCatalogOnMount } from "../../../entities/use-refresh-entity-catalog-on-mount";
import { DetailViewDesignerView } from "../../../features/detail-view-designer/DetailViewDesignerView";
import EntityNotFoundRoute from "../../app/entity-not-found";

export default function DesignLayoutDetailRoute() {
  const { t } = useTranslation("common");
  const { entityName, hasTarget } = useDesignLayoutSearchTarget();
  const { isKnownEntity, isLoading } = useEntityCatalog();
  useRefreshEntityCatalogOnMount();

  if (!hasTarget) {
    return <DesignLayoutEntityRedirect kind="detail" />;
  }

  if (isLoading) {
    return <EntityPageSkeleton />;
  }

  if (!entityName || !isKnownEntity(entityName)) {
    return <EntityNotFoundRoute />;
  }

  return (
    <DesignLayoutRouteGuard title={t("detailViewDesigner.title")}>
      <div className="flex min-h-0 flex-1 flex-col">
        <DetailViewDesignerView entityName={entityName as EntityName} />
      </div>
    </DesignLayoutRouteGuard>
  );
}
