import { useParams } from "react-router";

import { EntityForm } from "../../components/entity/EntityForm";
import { RequireEntityPermission } from "../../components/entity/RequireEntityPermission";
import { isEntityName } from "../../entities/entity-catalog";
import EntityNotFoundRoute from "./entity-not-found";

export default function EntityNewRoute() {
  const params = useParams();
  const entity = params.entity ?? "";

  if (!isEntityName(entity)) {
    return <EntityNotFoundRoute />;
  }

  return (
    <RequireEntityPermission entityName={entity} action="create">
      <EntityForm entityName={entity} mode="create" />
    </RequireEntityPermission>
  );
}
