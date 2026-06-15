import { Button } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";

export function DashboardLayoutDesignerStructurePanelFooter() {
  const { t } = useTranslation("common");
  const {
    structurePanelIsDirty,
    requestCloseStructurePanel,
    commitStructurePanelSave,
  } = useDashboardLayoutDesigner();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => requestCloseStructurePanel()}
      >
        {t("entity.cancel")}
      </Button>
      <Button
        type="button"
        disabled={!structurePanelIsDirty}
        onClick={() => commitStructurePanelSave()}
      >
        {t("entity.viewSettings.save")}
      </Button>
    </div>
  );
}
