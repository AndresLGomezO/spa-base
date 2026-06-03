import type { ReactNode } from "react";
import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";

export function DesignLayoutRouteGuard({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();
  const canAccess = usePermission("entityUiOverride.read");

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canAccess) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{title}</Heading>
        <Alert>{t("designLayout.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{title}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return <>{children}</>;
}
