import { Alert, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { UserAiContextView } from "../../features/user-ai-context/UserAiContextView";

export default function SettingsAiContextSectionsRoute() {
  const { t } = useTranslation("common");
  const { isReady } = useAuth();

  const canAccess = usePermission("aiContextSection.read");
  const canCreate = usePermission("aiContextSection.create");
  const canUpdate = usePermission("aiContextSection.update");
  const canDelete = usePermission("aiContextSection.delete");

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canAccess) {
    return (
      <div className="space-y-3">
        <Alert>{t("userAiContext.forbidden")}</Alert>
        <Text className="text-muted-foreground text-sm">
          {t("aiContext.tabForbiddenHint")}
        </Text>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <UserAiContextView
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
