import { Navigate, useLocation, useParams } from "react-router";

import { buildLegacyDesignLayoutFormDesignRedirectLocation } from "../../../components/design-layout/design-layout-search-params";

export default function LegacyDesignLayoutFormDesignRedirect() {
  const params = useParams();
  const entityName = params.entityName ?? "";
  const formDesignId = params.formDesignId ?? "default";
  const location = useLocation();

  return (
    <Navigate
      replace
      to={buildLegacyDesignLayoutFormDesignRedirectLocation(
        entityName,
        formDesignId,
        location.search,
      )}
    />
  );
}
