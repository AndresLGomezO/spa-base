import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { TranslationsView } from "../../features/translations/TranslationsView";

export default function SettingsTranslationsRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();

  const canAccess = usePermission("localePack.read");
  const canUpdate = usePermission("localePack.update");

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  // Admins who can update also need read; list endpoint is open to members,
  // but settings chrome still requires localePack.read (admins have all).
  if (!canAccess && !canUpdate) {
    return (
      <div className="space-y-3 p-macro">
        <Heading level={1}>{t("translations.title")}</Heading>
        <Alert>{t("translations.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3 p-macro">
        <Heading level={1}>{t("translations.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TranslationsView canUpdate={canUpdate} />
    </div>
  );
}
