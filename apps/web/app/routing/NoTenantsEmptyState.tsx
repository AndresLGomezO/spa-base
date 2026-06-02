import { useTranslation } from "react-i18next";

import { Alert, Button, Heading, Text } from "@repo/ui";

import { useAuth } from "../auth/AuthContext";
import { useCreateTenantModal } from "../components/platform/create-tenant-modal-context";

export function NoTenantsEmptyState() {
  const { t } = useTranslation("common");
  const { isSuperAdmin } = useAuth();
  const { openCreateTenantModal } = useCreateTenantModal();

  if (isSuperAdmin) {
    return (
      <div className="flex w-full max-w-lg flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Heading level={1}>{t("tenant.emptyTitle")}</Heading>
          <Text>{t("tenant.emptyDescription")}</Text>
        </div>
        <Button type="button" onClick={openCreateTenantModal}>
          {t("tenant.create")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <Text>{t("tenant.noTenants")}</Text>
      <Alert>{t("tenant.noTenantsDetail")}</Alert>
    </div>
  );
}
