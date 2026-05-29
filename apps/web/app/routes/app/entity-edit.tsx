import { useParams } from "react-router";

import { EntityForm } from "../../components/entity/EntityForm";
import { RequireEntityPermission } from "../../components/entity/RequireEntityPermission";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import EntityNotFoundRoute from "./entity-not-found";

export default function EntityEditRoute() {
  const params = useParams();
  const entity = params.entity ?? "";
  const id = params.id ?? "";
  const { isKnownEntity, isLoading } = useEntityCatalog();

  if (isLoading) {
    return null;
  }

  if (!isKnownEntity(entity) || id.length === 0) {
    return <EntityNotFoundRoute />;
  }

  return (
    <RequireEntityPermission entityName={entity} action="update">
      <EntityForm entityName={entity} mode="edit" recordId={id} />
    </RequireEntityPermission>
  );
}
