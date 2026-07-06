import { Navigate, useLocation, useParams } from "react-router";

import { designLayoutEntityPath } from "../../../routing/design-layout-nav";

export default function DesignLayoutNewFormsRedirect() {
  const params = useParams();
  const location = useLocation();
  const entityName = params.entityName ?? "";

  return (
    <Navigate
      replace
      to={designLayoutEntityPath("forms", entityName, location.search)}
    />
  );
}
