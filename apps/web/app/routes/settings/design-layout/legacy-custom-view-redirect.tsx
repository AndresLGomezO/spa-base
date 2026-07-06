import { Navigate, useLocation, useParams } from "react-router";

import { buildLegacyDesignLayoutCustomViewRedirectLocation } from "../../../components/design-layout/design-layout-search-params";
import type { DesignLayoutEntityKind } from "../../../components/design-layout/design-layout-kind";

type LegacyCustomViewKind = Extract<
  DesignLayoutEntityKind,
  "main" | "list" | "metrics"
>;

interface LegacyDesignLayoutCustomViewRedirectProps {
  readonly kind: LegacyCustomViewKind;
}

export function LegacyDesignLayoutCustomViewRedirect({
  kind,
}: LegacyDesignLayoutCustomViewRedirectProps) {
  const viewId = useParams().viewId ?? "";
  const location = useLocation();

  return (
    <Navigate
      replace
      to={buildLegacyDesignLayoutCustomViewRedirectLocation(
        kind,
        viewId,
        location.search,
      )}
    />
  );
}
