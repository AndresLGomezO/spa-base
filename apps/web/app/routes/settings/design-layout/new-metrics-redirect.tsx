import { Navigate, useLocation, useParams } from "react-router";

import { designLayoutEntityPath } from "../../../routing/design-layout-nav";

export default function DesignLayoutNewMetricsRedirect() {
  const params = useParams();
  const location = useLocation();
  const entityName = params.entityName ?? "";

  return (
    <Navigate
      replace
      to={designLayoutEntityPath("metrics", entityName, location.search)}
    />
  );
}
