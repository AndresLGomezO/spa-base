import { Button, Modal, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useFormDesigner } from "./FormDesignerProvider";

export function FormDesignerUnsavedChangesModal() {
  const { t } = useTranslation("common");
  const {
    unsavedChangesOpen,
    editor,
    confirmUnsavedSave,
    confirmUnsavedDiscard,
    cancelUnsavedChanges,
  } = useFormDesigner();

  return (
    <Modal
      open={unsavedChangesOpen}
      onClose={cancelUnsavedChanges}
      title={t("formDesigner.unsavedChanges.title")}
    >
      <Text>{t("formDesigner.unsavedChanges.message")}</Text>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          loading={editor.isSaving}
          onClick={() => void confirmUnsavedSave()}
        >
          {t("formDesigner.unsavedChanges.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={confirmUnsavedDiscard}
        >
          {t("formDesigner.unsavedChanges.discard")}
        </Button>
        <Button type="button" variant="ghost" onClick={cancelUnsavedChanges}>
          {t("formDesigner.unsavedChanges.keepEditing")}
        </Button>
      </div>
    </Modal>
  );
}
