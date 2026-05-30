import { useParams } from "react-router";

import { EntityForm } from "../../components/entity/EntityForm";
import { RequireEntityPermission } from "../../components/entity/RequireEntityPermission";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useRefreshEntityCatalogOnMount } from "../../entities/use-refresh-entity-catalog-on-mount";
import { EntityFormSkeleton } from "../../components/loading/EntityFormSkeleton";
import EntityNotFoundRoute from "./entity-not-found";

export default function EntityNewRoute() {
  const params = useParams();
  const entity = params.entity ?? "";
  const { isKnownEntity, isLoading } = useEntityCatalog();
  useRefreshEntityCatalogOnMount();

  if (isLoading) {
    return <EntityFormSkeleton />;
  }

  if (!isKnownEntity(entity)) {
    return <EntityNotFoundRoute />;
  }

  return (
    <RequireEntityPermission entityName={entity} action="create">
      <EntityForm entityName={entity} mode="create" />
    </RequireEntityPermission>
  );
}
