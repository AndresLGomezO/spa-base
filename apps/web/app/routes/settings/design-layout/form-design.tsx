import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router";

import { DesignLayoutRouteGuard } from "../../../components/design-layout/DesignLayoutRouteGuard";
import { useDesignLayoutSearchTarget } from "../../../components/design-layout/use-design-layout-search-target";
import { EntityPageSkeleton } from "../../../components/loading/EntityPageSkeleton";
import type { EntityName } from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import { useRefreshEntityCatalogOnMount } from "../../../entities/use-refresh-entity-catalog-on-mount";
import { FormDesignerView } from "../../../features/form-designer/FormDesignerView";
import { designLayoutEntityPath } from "../../../routing/design-layout-nav";
import EntityNotFoundRoute from "../../app/entity-not-found";

export default function DesignLayoutFormDesignRoute() {
  const { t } = useTranslation("common");
  const formDesignId = useParams().formDesignId ?? "default";
  const { entityName, hasTarget } = useDesignLayoutSearchTarget();
  const { isKnownEntity, isLoading } = useEntityCatalog();
  useRefreshEntityCatalogOnMount();

  if (!hasTarget) {
    return (
      <Navigate replace to={designLayoutEntityPath("forms", formDesignId)} />
    );
  }

  if (isLoading) {
    return <EntityPageSkeleton />;
  }

  if (!entityName || !isKnownEntity(entityName)) {
    return <EntityNotFoundRoute />;
  }

  return (
    <DesignLayoutRouteGuard title={t("formDesigner.title")}>
      <div className="flex min-h-0 flex-1 flex-col">
        <FormDesignerView
          entityName={entityName as EntityName}
          formDesignId={formDesignId}
        />
      </div>
    </DesignLayoutRouteGuard>
  );
}
