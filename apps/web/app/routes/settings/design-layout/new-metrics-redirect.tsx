import { Navigate, useLocation, useParams } from "react-router";

export default function DesignLayoutNewMetricsRedirect() {
  const params = useParams();
  const location = useLocation();
  const entityName = params.entityName ?? "";

  return (
    <Navigate
      to={`/settings/design-layout/metrics/${entityName}${location.search}`}
      replace
    />
  );
}
