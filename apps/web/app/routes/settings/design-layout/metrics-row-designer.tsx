import { useTranslation } from "react-i18next";

import { CustomViewDesignLayoutRoute } from "../../../components/custom-view/CustomViewDesignLayoutRoute";
import { DesignLayoutEntityRedirect } from "../../../components/design-layout/DesignLayoutEntityRedirect";
import { DesignLayoutRouteGuard } from "../../../components/design-layout/DesignLayoutRouteGuard";
import { useDesignLayoutSearchTarget } from "../../../components/design-layout/use-design-layout-search-target";
import { EntityPageSkeleton } from "../../../components/loading/EntityPageSkeleton";
import type { EntityName } from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import { useRefreshEntityCatalogOnMount } from "../../../entities/use-refresh-entity-catalog-on-mount";
import { MetricsRowDesignerView } from "../../../features/metrics-row-designer/MetricsRowDesignerView";
import EntityNotFoundRoute from "../../app/entity-not-found";

export default function DesignLayoutMetricsRoute() {
  const { t } = useTranslation("common");
  const { entityName, customViewId, hasTarget } = useDesignLayoutSearchTarget();
  const { isKnownEntity, isLoading } = useEntityCatalog();
  useRefreshEntityCatalogOnMount();

  if (!hasTarget) {
    return <DesignLayoutEntityRedirect kind="metrics" />;
  }

  if (customViewId) {
    return (
      <CustomViewDesignLayoutRoute
        viewId={customViewId}
        title={t("metricsRowDesigner.title")}
      >
        {(resolvedEntityName, resolvedCustomViewId) => (
          <MetricsRowDesignerView
            entityName={resolvedEntityName}
            customViewId={resolvedCustomViewId}
          />
        )}
      </CustomViewDesignLayoutRoute>
    );
  }

  if (isLoading) {
    return <EntityPageSkeleton />;
  }

  if (!entityName || !isKnownEntity(entityName)) {
    return <EntityNotFoundRoute />;
  }

  return (
    <DesignLayoutRouteGuard title={t("metricsRowDesigner.title")}>
      <div className="flex min-h-0 flex-1 flex-col">
        <MetricsRowDesignerView entityName={entityName as EntityName} />
      </div>
    </DesignLayoutRouteGuard>
  );
}
