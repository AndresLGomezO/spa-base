import { useTranslation } from "react-i18next";

import { getEntityLabel } from "../../entities/entity-catalog";
import { DesignedEntityFormModal } from "../../components/forms/DesignedEntityFormModal";
import { FormDesignerProductionPreviewContent } from "./FormDesignerProductionPreviewContent";
import { useFormDesigner } from "./form-designer-context";

export function FormDesignerOverlayPreview() {
  const { t } = useTranslation("common");
  const {
    editor,
    preview,
    overlayPreviewOpen,
    closeOverlayPreview,
    previewBreakpoint,
  } = useFormDesigner();
  const entityLabel = getEntityLabel(editor.definition);

  return (
    <DesignedEntityFormModal
      variant="overlay"
      open={overlayPreviewOpen}
      onClose={closeOverlayPreview}
      title={t("entity.createTitle", { entity: entityLabel })}
      forms={{
        modalSize: editor.modalSize,
        modalSizeByBreakpoint: editor.modalSizeByBreakpoint,
      }}
      simulatedBreakpoint={previewBreakpoint}
      scrollable={preview.previewFormScrollable}
      showHeader={preview.showHeader}
      showCloseButton={preview.showHeader}
      contentPadding={preview.previewContentPadding}
      footer={preview.previewFooter}
    >
      <FormDesignerProductionPreviewContent />
    </DesignedEntityFormModal>
  );
}
