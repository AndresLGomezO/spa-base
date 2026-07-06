import { Navigate, useLocation } from "react-router";

import { EntityPageSkeleton } from "../loading/EntityPageSkeleton";
import { Alert } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { DesignLayoutEntityKind } from "./design-layout-kind";
import { designLayoutEntityPath } from "../../routing/design-layout-nav";
import { useDesignLayoutEntityOptions } from "./use-design-layout-entity-options";

interface DesignLayoutEntityRedirectProps {
  readonly kind: DesignLayoutEntityKind;
}

export function DesignLayoutEntityRedirect({
  kind,
}: DesignLayoutEntityRedirectProps) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const { defaultEntity, isLoading, canAccessDesignLayout } =
    useDesignLayoutEntityOptions(kind);

  if (isLoading) {
    return <EntityPageSkeleton />;
  }

  if (!canAccessDesignLayout) {
    return <Alert>{t("designLayout.forbidden")}</Alert>;
  }

  if (!defaultEntity) {
    return <Alert>{t("error.notFoundDetail")}</Alert>;
  }

  return (
    <Navigate
      replace
      to={designLayoutEntityPath(kind, defaultEntity, location.search)}
    />
  );
}
