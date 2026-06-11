import { Button } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { LayoutPreviewBreakpointSwitcher } from "../ui-builder/LayoutPreviewPanel";
import { useFormDesigner } from "./form-designer-context";
import { FormDesignerHeaderSettingsMenu } from "./FormDesignerHeaderSettingsMenu";

export function FormDesignerHeaderActions() {
  const { t } = useTranslation("common");
  const { previewBreakpoint, setPreviewBreakpoint, openOverlayPreview } =
    useFormDesigner();

  return (
    <div className="flex items-end gap-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={openOverlayPreview}
      >
        {t("formDesigner.openPreview")}
      </Button>
      <LayoutPreviewBreakpointSwitcher
        breakpoint={previewBreakpoint}
        onBreakpointChange={setPreviewBreakpoint}
      />
      <FormDesignerHeaderSettingsMenu />
    </div>
  );
}
