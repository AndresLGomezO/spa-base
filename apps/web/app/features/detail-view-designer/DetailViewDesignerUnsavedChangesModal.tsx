import { Button, Modal, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useDetailViewDesigner } from "./detail-view-designer-context";

export function DetailViewDesignerUnsavedChangesModal() {
  const { t } = useTranslation("common");
  const {
    unsavedChangesOpen,
    unsavedTabId,
    unsavedReason,
    editor,
    confirmUnsavedSave,
    confirmUnsavedDiscard,
    cancelUnsavedChanges,
  } = useDetailViewDesigner();

  const messageKey =
    unsavedReason === "structurePanel"
      ? "detailViewDesigner.unsavedChanges.structurePanelMessage"
      : unsavedTabId === "layout"
        ? "detailViewDesigner.unsavedChanges.layoutMessage"
        : "detailViewDesigner.unsavedChanges.settingsMessage";

  const saveLabelKey =
    unsavedReason === "structurePanel"
      ? "detailViewDesigner.unsavedChanges.structurePanelSave"
      : "detailViewDesigner.unsavedChanges.save";

  return (
    <Modal
      open={unsavedChangesOpen}
      onClose={cancelUnsavedChanges}
      title={t("detailViewDesigner.unsavedChanges.title")}
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
          {t("detailViewDesigner.unsavedChanges.discard")}
        </Button>
        <Button type="button" variant="ghost" onClick={cancelUnsavedChanges}>
          {t("detailViewDesigner.unsavedChanges.keepEditing")}
        </Button>
      </div>
    </Modal>
  );
}
