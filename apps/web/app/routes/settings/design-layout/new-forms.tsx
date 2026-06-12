import { Navigate, useParams } from "react-router";

export default function DesignLayoutNewFormsRedirect() {
  const params = useParams();
  const entityName = params.entityName ?? "";
  return (
    <Navigate to={`/settings/design-layout/forms/${entityName}`} replace />
  );
}
