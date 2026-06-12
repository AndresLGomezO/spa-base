import { Navigate, useLocation, useParams } from "react-router";

export default function DesignLayoutNewDetailRedirect() {
  const params = useParams();
  const location = useLocation();
  const entityName = params.entityName ?? "";

  return (
    <Navigate
      to={`/settings/design-layout/detail/${entityName}${location.search}`}
      replace
    />
  );
}
