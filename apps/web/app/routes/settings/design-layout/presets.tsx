import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useTranslation } from "react-i18next";

import { useAnyPermission } from "../../../auth/useAnyPermission";
import { DesignLayoutRouteGuard } from "../../../components/design-layout/DesignLayoutRouteGuard";
import { PresetsView } from "../../../features/ui-builder/presets/PresetsView";

export default function DesignLayoutPresetsRoute() {
  const { t } = useTranslation("common");

  return (
    <DesignLayoutRouteGuard title={t("designLayout.presets.title")}>
      <DesignLayoutPresetsPage />
    </DesignLayoutRouteGuard>
  );
}

function DesignLayoutPresetsPage() {
  const canWrite = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);

  return (
    <PresetsView
      canCreate={canWrite}
      canUpdate={canWrite}
      canDelete={canWrite}
    />
  );
}
