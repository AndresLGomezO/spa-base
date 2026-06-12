import { Button, Modal, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useMainViewDesigner } from "./main-view-designer-context";

export function MainViewDesignerUnsavedChangesModal() {
  const { t } = useTranslation("common");
  const {
    unsavedChangesOpen,
    unsavedTabId,
    unsavedReason,
    editor,
    confirmUnsavedSave,
    confirmUnsavedDiscard,
    cancelUnsavedChanges,
  } = useMainViewDesigner();

  const messageKey =
    unsavedReason === "structurePanel"
      ? "mainViewDesigner.unsavedChanges.structurePanelMessage"
      : unsavedTabId === "layout"
        ? "mainViewDesigner.unsavedChanges.layoutMessage"
        : "mainViewDesigner.unsavedChanges.settingsMessage";

  const saveLabelKey =
    unsavedReason === "structurePanel"
      ? "mainViewDesigner.unsavedChanges.structurePanelSave"
      : "mainViewDesigner.unsavedChanges.save";

  return (
    <Modal
      open={unsavedChangesOpen}
      onClose={cancelUnsavedChanges}
      title={t("mainViewDesigner.unsavedChanges.title")}
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
          {t("mainViewDesigner.unsavedChanges.discard")}
        </Button>
        <Button type="button" variant="ghost" onClick={cancelUnsavedChanges}>
          {t("mainViewDesigner.unsavedChanges.keepEditing")}
        </Button>
      </div>
    </Modal>
  );
}
