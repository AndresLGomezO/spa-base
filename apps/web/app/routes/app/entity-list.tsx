import { useParams } from "react-router";

import { EntityPage } from "../../components/entity/EntityPage";
import { RequireEntityPermission } from "../../components/entity/RequireEntityPermission";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useRefreshEntityCatalogOnMount } from "../../entities/use-refresh-entity-catalog-on-mount";
import { EntityPageSkeleton } from "../../components/loading/EntityPageSkeleton";
import EntityNotFoundRoute from "./entity-not-found";

export default function EntityListRoute() {
  const params = useParams();
  const entity = params.entity ?? "";
  const { isKnownEntity, isLoading } = useEntityCatalog();
  useRefreshEntityCatalogOnMount();

  if (isLoading) {
    return <EntityPageSkeleton />;
  }

  if (!isKnownEntity(entity)) {
    return <EntityNotFoundRoute />;
  }

  return (
    <RequireEntityPermission entityName={entity}>
      <EntityPage key={entity} entityName={entity} />
    </RequireEntityPermission>
  );
}
