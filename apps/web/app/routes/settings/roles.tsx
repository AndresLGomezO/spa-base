import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { RoleManager } from "../../components/roles/RoleManager";

export default function SettingsRolesRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId, permissions, isSuperAdmin } = useAuth();

  const canAccess = isSuperAdmin || permissions.includes("role.read");
  const canCreate = isSuperAdmin || permissions.includes("role.create");
  const canUpdate = isSuperAdmin || permissions.includes("role.update");

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
    <div className="space-y-4">
      <div className="space-y-2">
        <Heading level={1}>{t("roles.title")}</Heading>
        <Text>{t("roles.description")}</Text>
      </div>
      <RoleManager
        tenantId={tenantId}
        canCreate={canCreate}
        canUpdate={canUpdate}
      />
    </div>
  );
}
