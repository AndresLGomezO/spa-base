import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { RoleManager } from "../../components/roles/RoleManager";

export default function SettingsRolesRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();

  const canAccess = usePermission("role.read");
  const canCreate = usePermission("role.create");
  const canUpdate = usePermission("role.update");

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canAccess) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("roles.title")}</Heading>
        <Alert>{t("roles.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("roles.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="shrink-0 space-y-2">
        <Heading level={1}>{t("roles.title")}</Heading>
        <Text>{t("roles.description")}</Text>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <RoleManager
          tenantId={tenantId}
          canCreate={canCreate}
          canUpdate={canUpdate}
        />
      </div>
    </div>
  );
}
