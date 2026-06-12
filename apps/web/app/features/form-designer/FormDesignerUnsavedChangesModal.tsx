import { Button, Modal, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useFormDesigner } from "./form-designer-context";

export function FormDesignerUnsavedChangesModal() {
  const { t } = useTranslation("common");
  const {
    unsavedChangesOpen,
    unsavedTabId,
    unsavedReason,
    editor,
    confirmUnsavedSave,
    confirmUnsavedDiscard,
    cancelUnsavedChanges,
  } = useFormDesigner();

  const messageKey =
    unsavedReason === "columnPanel"
      ? "formDesigner.unsavedChanges.columnPanelMessage"
      : unsavedReason === "rootLayoutPanel"
        ? "formDesigner.unsavedChanges.rootLayoutPanelMessage"
        : unsavedReason === "componentRowPanel"
          ? "formDesigner.unsavedChanges.componentRowPanelMessage"
          : unsavedTabId === "layout"
            ? "formDesigner.unsavedChanges.layoutMessage"
            : unsavedTabId === "components"
              ? "formDesigner.unsavedChanges.componentsMessage"
              : "formDesigner.unsavedChanges.message";

  const saveLabelKey =
    unsavedReason === "columnPanel"
      ? "formDesigner.unsavedChanges.columnPanelSave"
      : unsavedReason === "rootLayoutPanel"
        ? "formDesigner.unsavedChanges.rootLayoutPanelSave"
        : unsavedReason === "componentRowPanel"
          ? "formDesigner.unsavedChanges.componentRowPanelSave"
          : "formDesigner.unsavedChanges.save";

  return (
    <Modal
      open={unsavedChangesOpen}
      onClose={cancelUnsavedChanges}
      title={t("formDesigner.unsavedChanges.title")}
    >
      <Text>{t(messageKey)}</Text>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          loading={unsavedReason === "tab" ? editor.isSaving : false}
          onClick={() => void confirmUnsavedSave()}
        >
          {t(saveLabelKey)}
        </Button>
        <Button type="button" variant="outline" onClick={confirmUnsavedDiscard}>
          {t("formDesigner.unsavedChanges.discard")}
        </Button>
        <Button type="button" variant="ghost" onClick={cancelUnsavedChanges}>
          {t("formDesigner.unsavedChanges.keepEditing")}
        </Button>
      </div>
    </Modal>
  );
}
