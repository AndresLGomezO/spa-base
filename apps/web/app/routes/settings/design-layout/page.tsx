import { Navigate, useParams } from "react-router";

export default function DesignLayoutPageRedirect() {
  const params = useParams();
  const entityName = params.entityName ?? "";
  return <Navigate to={`/settings/design-layout/main/${entityName}`} replace />;
}
