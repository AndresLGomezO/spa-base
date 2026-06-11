import { useTranslation } from "react-i18next";

import { getEntityLabel } from "../../entities/entity-catalog";
import { FormModal } from "../../components/forms/FormModal";
import { FormDesignerProductionPreviewContent } from "./FormDesignerProductionPreviewContent";
import { useFormDesigner } from "./form-designer-context";

export function FormDesignerOverlayPreview() {
  const { t } = useTranslation("common");
  const { editor, preview, overlayPreviewOpen, closeOverlayPreview } =
    useFormDesigner();
  const entityLabel = getEntityLabel(editor.definition);

  return (
    <FormModal
      variant="overlay"
      open={overlayPreviewOpen}
      onClose={closeOverlayPreview}
      title={t("entity.createTitle", { entity: entityLabel })}
      size={preview.modalSize}
      scrollable={preview.previewFormScrollable}
      showHeader={preview.showHeader}
      showCloseButton={preview.showHeader}
      contentPadding={preview.previewContentPadding}
      footer={preview.previewFooter}
    >
      <FormDesignerProductionPreviewContent />
    </FormModal>
  );
}
