import { Button } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { LayoutPreviewBreakpointSwitcher } from "../ui-builder/LayoutPreviewPanel";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { useFormDesigner } from "./form-designer-context";
import { FormDesignerAiControls } from "./FormDesignerAiControls";
import { FormDesignerHeaderSettingsMenu } from "./FormDesignerHeaderSettingsMenu";

export function FormDesignerHeaderActions() {
  const { t } = useTranslation("common");
  const {
    previewBreakpoint,
    setPreviewBreakpoint,
    openOverlayPreview,
    editor,
  } = useFormDesigner();
  const definition = useEntityDefinition(editor.entityName);
  const entityLabel = definition.ui.nav?.label ?? editor.entityName;

  return (
    <div className="flex items-end gap-3">
      <FormDesignerAiControls
        entityName={editor.entityName}
        entityLabel={entityLabel}
        definition={definition}
        editor={editor}
      />
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
