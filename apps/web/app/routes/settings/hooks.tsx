import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { HookManager } from "../../components/hooks/HookManager";

export default function SettingsHooksRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();

  const canAccess = usePermission("hook.read");
  const canCreate = usePermission("hook.create");
  const canUpdate = usePermission("hook.update");

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
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
    <div className="flex min-h-full flex-col gap-4">
      <div className="shrink-0 space-y-2">
        <Heading level={1}>{t("hooks.title")}</Heading>
        <Text>{t("hooks.description")}</Text>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <HookManager
          tenantId={tenantId}
          canCreate={canCreate}
          canUpdate={canUpdate}
        />
      </div>
    </div>
  );
}
