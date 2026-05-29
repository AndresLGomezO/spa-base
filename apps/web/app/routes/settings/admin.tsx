import { Alert, Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useAuth } from "../../auth/AuthContext";
import { UserRoleManager } from "../../components/admin/UserRoleManager";
import { TenantManager } from "../../components/admin/TenantManager";

export default function SettingsAdminRoute() {
  const { t } = useTranslation("common");
  const { isReady, isSuperAdmin } = useAuth();

  if (!isReady) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center p-6">
        <Text>{t("loading")}</Text>
      </main>
    );
  }

  if (!isSuperAdmin) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center gap-3 p-6">
        <Heading level={1}>{t("admin.title")}</Heading>
        <Text>{t("admin.forbidden")}</Text>
        <Alert>{t("admin.forbiddenDetail")}</Alert>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <Heading level={1}>{t("admin.title")}</Heading>
        <Text>{t("admin.description")}</Text>
      </div>
      <section className="flex flex-col gap-3">
        <Heading level={2}>{t("admin.tenants.title")}</Heading>
        <Text>{t("admin.tenants.description")}</Text>
        <TenantManager />
      </section>
      <section className="flex flex-col gap-3">
        <Heading level={2}>{t("admin.users.title")}</Heading>
        <UserRoleManager />
      </section>
      <Text>
        <Link to="/" className="text-primary underline">
          {t("nav.home")}
        </Link>
      </Text>
    </main>
  );
}
