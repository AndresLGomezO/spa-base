import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { FormulasView } from "../../features/formulas/FormulasView";

export default function SettingsFormulasRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();

  const canAccess = usePermission("formula.read");
  const canCreate = usePermission("formula.create");
  const canUpdate = usePermission("formula.update");
  const canDelete = usePermission("formula.delete");

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canAccess) {
    return (
      <div className="space-y-3 p-macro">
        <Heading level={1}>{t("formulas.title")}</Heading>
        <Alert>{t("formulas.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3 p-macro">
        <Heading level={1}>{t("formulas.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FormulasView
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
