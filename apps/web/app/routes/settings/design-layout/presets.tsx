import { Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useAnyPermission } from "../../../auth/useAnyPermission";
import { DesignLayoutRouteGuard } from "../../../components/design-layout/DesignLayoutRouteGuard";
import { UiBuilderPresetManager } from "../../../features/ui-builder/UiBuilderPresetManager";

export default function DesignLayoutPresetsRoute() {
  const { t } = useTranslation("common");

  return (
    <DesignLayoutRouteGuard title={t("designLayout.presets.title")}>
      <DesignLayoutPresetsPage />
    </DesignLayoutRouteGuard>
  );
}

function DesignLayoutPresetsPage() {
  const { t } = useTranslation("common");
  const canUpdate = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="space-y-2">
        <Heading level={1}>{t("designLayout.presets.title")}</Heading>
        <Text>{t("designLayout.presets.description")}</Text>
      </div>
      <UiBuilderPresetManager canUpdate={canUpdate} />
    </div>
  );
}
