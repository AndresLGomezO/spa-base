import { Button } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";

export function SidebarLayoutDesignerStructurePanelFooter() {
  const { t } = useTranslation("common");
  const {
    structurePanelIsDirty,
    requestCloseStructurePanel,
    commitStructurePanelSave,
  } = useSidebarLayoutDesigner();

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
