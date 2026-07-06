import { Navigate, useLocation, useParams } from "react-router";

import { buildLegacyDesignLayoutEntityRedirectLocation } from "../../../components/design-layout/design-layout-search-params";
import type { DesignLayoutEntityKind } from "../../../components/design-layout/design-layout-kind";

interface LegacyDesignLayoutEntityRedirectProps {
  readonly kind: DesignLayoutEntityKind;
}

export function LegacyDesignLayoutEntityRedirect({
  kind,
}: LegacyDesignLayoutEntityRedirectProps) {
  const entityName = useParams().entityName ?? "";
  const location = useLocation();

  return (
    <Navigate
      replace
      to={buildLegacyDesignLayoutEntityRedirectLocation(
        kind,
        entityName,
        location.search,
      )}
    />
  );
}
