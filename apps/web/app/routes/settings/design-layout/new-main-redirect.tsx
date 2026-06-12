import { Navigate, useLocation, useParams } from "react-router";

export default function DesignLayoutNewMainRedirect() {
  const params = useParams();
  const location = useLocation();
  const entityName = params.entityName ?? "";

  return (
    <Navigate
      to={`/settings/design-layout/main/${entityName}${location.search}`}
      replace
    />
  );
}
