import { useParams } from "react-router";

import { EntityForm } from "../../components/entity/EntityForm";
import { RequireEntityPermission } from "../../components/entity/RequireEntityPermission";
import { isEntityName } from "../../entities/entity-catalog";
import EntityNotFoundRoute from "./entity-not-found";

export default function EntityEditRoute() {
  const params = useParams();
  const entity = params.entity ?? "";
  const id = params.id ?? "";

  if (!isEntityName(entity) || id.length === 0) {
    return <EntityNotFoundRoute />;
  }

  return (
    <RequireEntityPermission entityName={entity} action="update">
      <EntityForm entityName={entity} mode="edit" recordId={id} />
    </RequireEntityPermission>
  );
}
