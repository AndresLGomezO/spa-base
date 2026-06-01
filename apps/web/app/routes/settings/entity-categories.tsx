import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { EntityCategoryManager } from "../../components/entity-categories/EntityCategoryManager";

export default function SettingsEntityCategoriesRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();

  const canAccess = usePermission("entityCategory.read");
  const canCreate = usePermission("entityCategory.create");
  const canUpdate = usePermission("entityCategory.update");

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canAccess) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("entityCategories.title")}</Heading>
        <Alert>{t("entityCategories.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("entityCategories.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="shrink-0 space-y-2">
        <Heading level={1}>{t("entityCategories.title")}</Heading>
        <Text>{t("entityCategories.description")}</Text>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <EntityCategoryManager
          tenantId={tenantId}
          canCreate={canCreate}
          canUpdate={canUpdate}
        />
      </div>
    </div>
  );
}
