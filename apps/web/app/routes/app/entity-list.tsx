import { useParams } from "react-router";

import { EntityPage } from "../../components/entity/EntityPage";
import { RequireEntityPermission } from "../../components/entity/RequireEntityPermission";
import { isEntityName } from "../../entities/entity-catalog";
import EntityNotFoundRoute from "./entity-not-found";

export default function EntityListRoute() {
  const params = useParams();
  const entity = params.entity ?? "";

  if (!isEntityName(entity)) {
    return <EntityNotFoundRoute />;
  }

  return (
    <RequireEntityPermission entityName={entity}>
      <EntityPage entityName={entity} />
    </RequireEntityPermission>
  );
}
