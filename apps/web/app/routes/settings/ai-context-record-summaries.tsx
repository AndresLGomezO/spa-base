import { Alert, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { RecordAiSummaryTemplatesView } from "../../features/record-ai-summary-templates/RecordAiSummaryTemplatesView";

export default function SettingsAiContextRecordSummariesRoute() {
  const { t } = useTranslation("common");
  const { isReady } = useAuth();

  const canAccess = usePermission("aiRecordSummaryTemplate.read");
  const canUpdate = usePermission("aiRecordSummaryTemplate.update");
  const canDelete = usePermission("aiRecordSummaryTemplate.delete");

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canAccess) {
    return (
      <div className="space-y-3">
        <Alert>{t("recordAiSummaryTemplates.forbidden")}</Alert>
        <Text className="text-muted-foreground text-sm">
          {t("aiContext.tabForbiddenHint")}
        </Text>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RecordAiSummaryTemplatesView
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
