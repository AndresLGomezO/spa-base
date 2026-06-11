import { useTranslation } from "react-i18next";

import { FormModal } from "../../components/forms/FormModal";
import {
  LayoutPreviewBreakpointSwitcher,
  LayoutPreviewViewport,
} from "../ui-builder/LayoutPreviewPanel";
import { useFormDesigner } from "./FormDesignerProvider";
import { useFormDesignerPreview } from "./use-form-designer-preview";

export function FormDesignerOverlayPreview() {
  const { t } = useTranslation("common");
  const {
    editor,
    previewBreakpoint,
    setPreviewBreakpoint,
    overlayPreviewOpen,
    closeOverlayPreview,
  } = useFormDesigner();
  const preview = useFormDesignerPreview(editor);

  return (
    <FormModal
      variant="overlay"
      open={overlayPreviewOpen}
      onClose={closeOverlayPreview}
      title={t("entity.viewSettings.preview")}
      size={preview.modalSize}
      scrollable={preview.previewFormScrollable}
      showHeader={preview.showHeader}
      showCloseButton={preview.showHeader}
      contentPadding={preview.previewContentPadding}
      footer={
        preview.usesDesignedModalFooter ? preview.previewFooter : undefined
      }
    >
      <div className="flex flex-col gap-3">
        <LayoutPreviewBreakpointSwitcher
          breakpoint={previewBreakpoint}
          onBreakpointChange={setPreviewBreakpoint}
        />
        <LayoutPreviewViewport breakpoint={previewBreakpoint}>
          {preview.formPreviewContent}
        </LayoutPreviewViewport>
      </div>
    </FormModal>
  );
}
