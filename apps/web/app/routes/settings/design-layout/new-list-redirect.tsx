import { Navigate, useLocation, useParams } from "react-router";

export default function DesignLayoutNewListRedirect() {
  const params = useParams();
  const location = useLocation();
  const entityName = params.entityName ?? "";

  return (
    <Navigate
      to={`/settings/design-layout/list/${entityName}${location.search}`}
      replace
    />
  );
}
