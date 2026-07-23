import { Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { EmailMatchingView } from "../../features/email-matching/EmailMatchingView";

export default function SettingsEmailMatchingRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!tenantId) {
    return (
      <div className="space-y-3 p-macro">
        <Heading level={1}>{t("emailMatchingWorkbench.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EmailMatchingView canCreate canUpdate canDelete />
    </div>
  );
}
