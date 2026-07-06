import { Alert, Heading, PageLoader } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { CustomViewsView } from "../../features/custom-views/CustomViewsView";

export default function SettingsCustomViewsRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();
  const canCreate = usePermission("customView.create");
  const canUpdate = usePermission("customView.update");
  const canDelete = usePermission("customView.delete");
  const canAccess = canCreate || canUpdate;

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canAccess) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("customViews.title")}</Heading>
        <Alert>{t("customViews.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("customViews.title")}</Heading>
        <Alert>{t("tenant.selectDescription")}</Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CustomViewsView
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
