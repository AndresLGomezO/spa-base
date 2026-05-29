import { Button, Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../auth/AuthContext";
import {
  AdminOverview,
  hasControlPlaneAccess,
} from "../components/admin/AdminOverview";

export function HomePage() {
  const { t } = useTranslation("common");
  const { user, logout, permissions, isSuperAdmin } = useAuth();

  if (hasControlPlaneAccess(permissions, isSuperAdmin)) {
    return <AdminOverview />;
  }

  return (
    <>
      <Heading level={1}>{t("home.title")}</Heading>
      <Text>{t("home.sessionActive")}</Text>
      <Text>
        {t("home.signedInAs")}{" "}
        <strong>{user?.email ?? t("home.unknownUser")}</strong>
      </Text>
      <Text>
        {t("home.provider")}: {user?.providerId ?? "email/password"}
      </Text>
      <Button type="button" onClick={() => void logout()}>
        {t("home.logout")}
      </Button>
    </>
  );
}
