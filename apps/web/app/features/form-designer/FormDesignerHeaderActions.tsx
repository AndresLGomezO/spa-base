import { Button, IconButton } from "@repo/ui";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

import { LayoutPreviewBreakpointSwitcher } from "../ui-builder/LayoutPreviewPanel";
import { useFormDesigner } from "./FormDesignerProvider";

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
      <IconButton
        type="button"
        label={t("formDesigner.settings")}
        size="sm"
        disabled
      >
        <Settings className="size-4" />
      </IconButton>
    </div>
  );
}
