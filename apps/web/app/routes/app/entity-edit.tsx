import { Navigate, useParams } from "react-router";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import EntityNotFoundRoute from "./entity-not-found";

export default function EntityEditRedirectRoute() {
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
    <Navigate
      to={`/app/${entity}?${new URLSearchParams({ edit: id }).toString()}`}
      replace
    />
  );
}
