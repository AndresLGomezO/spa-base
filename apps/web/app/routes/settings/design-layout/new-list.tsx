import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { DesignLayoutRouteGuard } from "../../../components/design-layout/DesignLayoutRouteGuard";
import { EntityPageSkeleton } from "../../../components/loading/EntityPageSkeleton";
import type { EntityName } from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import { useRefreshEntityCatalogOnMount } from "../../../entities/use-refresh-entity-catalog-on-mount";
import { ItemListDesignerView } from "../../../features/item-list-designer/ItemListDesignerView";
import EntityNotFoundRoute from "../../app/entity-not-found";

export default function DesignLayoutNewListRoute() {
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
    <DesignLayoutRouteGuard title={t("itemListDesigner.title")}>
      <div className="flex min-h-0 flex-1 flex-col">
        <ItemListDesignerView entityName={entityName} />
      </div>
    </DesignLayoutRouteGuard>
  );
}
