import { Button } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useFormDesigner } from "./form-designer-context";

export function FormDesignerLayoutColumnPanelFooter() {
  const { t } = useTranslation("common");
  const {
    columnPanelIsDirty,
    requestCloseLayoutColumnPanel,
    commitColumnPanelSave,
  } = useFormDesigner();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => requestCloseLayoutColumnPanel()}
      >
        {t("entity.cancel")}
      </Button>
      <Button
        type="button"
        disabled={!columnPanelIsDirty}
        onClick={() => commitColumnPanelSave()}
      >
        {t("entity.viewSettings.save")}
      </Button>
    </div>
  );
}
