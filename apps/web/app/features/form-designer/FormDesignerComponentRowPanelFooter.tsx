import { Button } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useFormDesigner } from "./form-designer-context";

export function FormDesignerComponentRowPanelFooter() {
  const { t } = useTranslation("common");
  const {
    componentRowPanelIsDirty,
    requestCloseComponentRowPanel,
    commitComponentRowPanelSave,
  } = useFormDesigner();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => requestCloseComponentRowPanel()}
      >
        {t("entity.cancel")}
      </Button>
      <Button
        type="button"
        disabled={!componentRowPanelIsDirty}
        onClick={() => commitComponentRowPanelSave()}
      >
        {t("entity.viewSettings.save")}
      </Button>
    </div>
  );
}
