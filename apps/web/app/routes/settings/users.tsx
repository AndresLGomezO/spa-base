import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { UserManagement } from "../../components/settings/UserManagement";

export default function SettingsUsersRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();

  const canRead = usePermission("tenantUser.read");
  const canCreate = usePermission("tenantUser.create");
  const canUpdate = usePermission("tenantUser.update");
  const canRemove = usePermission("tenantUser.remove");

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
    <div className="flex min-h-full flex-col gap-4">
      <div className="shrink-0 space-y-2">
        <Heading level={1}>{t("userManagement.title")}</Heading>
        <Text>{t("userManagement.description")}</Text>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <UserManagement
          tenantId={tenantId}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canRemove={canRemove}
        />
      </div>
    </div>
  );
}
