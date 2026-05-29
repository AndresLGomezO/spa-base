import { Alert, Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { HookManager } from "../../components/hooks/HookManager";

export default function SettingsHooksRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId, permissions, isSuperAdmin } = useAuth();

  const canAccess = isSuperAdmin || permissions.includes("hook.read");
  const canCreate = isSuperAdmin || permissions.includes("hook.create");
  const canUpdate = isSuperAdmin || permissions.includes("hook.update");

  if (!isReady) {
    return <Text>{t("loading")}</Text>;
  }

  if (!canAccess) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("hooks.title")}</Heading>
        <Alert>{t("hooks.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("hooks.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Heading level={1}>{t("hooks.title")}</Heading>
        <Text>{t("hooks.description")}</Text>
      </div>
      <HookManager
        tenantId={tenantId}
        canCreate={canCreate}
        canUpdate={canUpdate}
      />
    </div>
  );
}
