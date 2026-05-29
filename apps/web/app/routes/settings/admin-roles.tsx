import { useCallback, useEffect, useState } from "react";
import { Alert, Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useAuth } from "../../auth/AuthContext";
import { RoleManager } from "../../components/roles/RoleManager";
import { listAdminTenants } from "../../lib/admin-client";

export default function SettingsAdminRolesRoute() {
  const { t } = useTranslation("common");
  const { isReady, isSuperAdmin } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [tenantOptions, setTenantOptions] = useState<
    readonly { readonly id: string; readonly name: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    setError(null);
    try {
      const tenants = await listAdminTenants();
      const options = tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
      }));
      setTenantOptions(options);
      setTenantId((current) => current || options[0]?.id || "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("admin.tenants.loadFailed"),
      );
    }
  }, [t]);

  useEffect(() => {
    if (isSuperAdmin) {
      void loadTenants();
    }
  }, [isSuperAdmin, loadTenants]);

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
        <Heading level={1}>{t("roles.title")}</Heading>
        <Text>{t("admin.forbidden")}</Text>
        <Alert>{t("admin.forbiddenDetail")}</Alert>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <Heading level={1}>{t("roles.adminTitle")}</Heading>
        <Text>{t("roles.adminDescription")}</Text>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <RoleManager
        tenantId={tenantId}
        canCreate
        canUpdate
        showTenantPicker
        tenantOptions={tenantOptions}
        onTenantChange={setTenantId}
      />

      <Text>
        <Link to="/settings/admin" className="text-primary underline">
          {t("nav.admin")}
        </Link>
      </Text>
    </main>
  );
}
