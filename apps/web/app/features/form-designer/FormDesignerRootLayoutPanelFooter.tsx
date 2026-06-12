import { Button } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useFormDesigner } from "./form-designer-context";

export function FormDesignerRootLayoutPanelFooter() {
  const { t } = useTranslation("common");
  const {
    rootLayoutPanelIsDirty,
    requestCloseRootLayoutPanel,
    commitRootLayoutPanelSave,
  } = useFormDesigner();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => requestCloseRootLayoutPanel()}
      >
        {t("entity.cancel")}
      </Button>
      <Button
        type="button"
        disabled={!rootLayoutPanelIsDirty}
        onClick={() => commitRootLayoutPanelSave()}
      >
        {t("entity.viewSettings.save")}
      </Button>
    </div>
  );
}
