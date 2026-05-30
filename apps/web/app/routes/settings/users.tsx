import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { UserManagement } from "../../components/settings/UserManagement";

export default function SettingsUsersRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId, permissions, isSuperAdmin } = useAuth();

  const canRead = isSuperAdmin || permissions.includes("tenantUser.read");
  const canCreate = isSuperAdmin || permissions.includes("tenantUser.create");
  const canUpdate = isSuperAdmin || permissions.includes("tenantUser.update");
  const canRemove = isSuperAdmin || permissions.includes("tenantUser.remove");

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canRead) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("userManagement.title")}</Heading>
        <Alert>{t("userManagement.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("userManagement.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Heading level={1}>{t("userManagement.title")}</Heading>
        <Text>{t("userManagement.description")}</Text>
      </div>
      <UserManagement
        tenantId={tenantId}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canRemove={canRemove}
      />
    </div>
  );
}
