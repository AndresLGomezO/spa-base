import { Navigate, useParams } from "react-router";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import EntityNotFoundRoute from "./entity-not-found";

export default function EntityNewRedirectRoute() {
  const params = useParams();
  const entity = params.entity ?? "";
  const { isKnownEntity, isLoading } = useEntityCatalog();

  if (isLoading) {
    return null;
  }

  if (!isKnownEntity(entity)) {
    return <EntityNotFoundRoute />;
  }

  return <Navigate to={`/app/${entity}?create`} replace />;
}
