import { Alert, Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { UserRoleManager } from "../../components/admin/UserRoleManager";

export default function SettingsAdminRoute() {
  const { t } = useTranslation("common");
  const { isReady, isSuperAdmin } = useAuth();

  if (!isReady) {
    return <Text>{t("loading")}</Text>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex w-full flex-col gap-3">
        <Heading level={1}>{t("admin.title")}</Heading>
        <Text>{t("admin.forbidden")}</Text>
        <Alert>{t("admin.forbiddenDetail")}</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Heading level={1}>{t("admin.title")}</Heading>
        <Text>{t("admin.description")}</Text>
      </div>
      <UserRoleManager />
    </div>
  );
}
