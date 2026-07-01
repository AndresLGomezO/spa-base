import { Navigate, useLocation, useParams } from "react-router";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { resolveEntityListPath } from "../../routing/entity-navigation";
import EntityNotFoundRoute from "./entity-not-found";

export default function EntityNewRedirectRoute() {
  const params = useParams();
  const entity = params.entity ?? "";
  const { pathname } = useLocation();
  const { isKnownEntity, isLoading } = useEntityCatalog();

  if (isLoading) {
    return null;
  }

  if (!isKnownEntity(entity)) {
    return <EntityNotFoundRoute />;
  }

  return (
    <Navigate
      to={`${resolveEntityListPath(entity, pathname)}?create`}
      replace
    />
  );
}
