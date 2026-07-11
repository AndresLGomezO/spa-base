import { Button, Modal, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";

export function SidebarLayoutDesignerUnsavedChangesModal() {
  const { t } = useTranslation("common");
  const {
    unsavedChangesOpen,
    unsavedReason,
    editor,
    confirmUnsavedSave,
    confirmUnsavedDiscard,
    cancelUnsavedChanges,
  } = useSidebarLayoutDesigner();

  const messageKey =
    unsavedReason === "tab"
      ? "sidebarLayoutDesigner.unsavedChanges.tabMessage"
      : "sidebarLayoutDesigner.unsavedChanges.structurePanelMessage";

  const saveLabelKey =
    unsavedReason === "tab"
      ? "sidebarLayoutDesigner.unsavedChanges.save"
      : "sidebarLayoutDesigner.unsavedChanges.structurePanelSave";

  return (
    <Modal
      open={unsavedChangesOpen}
      onClose={cancelUnsavedChanges}
      title={t("sidebarLayoutDesigner.unsavedChanges.title")}
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
          {t("sidebarLayoutDesigner.unsavedChanges.discard")}
        </Button>
        <Button type="button" variant="ghost" onClick={cancelUnsavedChanges}>
          {t("sidebarLayoutDesigner.unsavedChanges.keepEditing")}
        </Button>
      </div>
    </Modal>
  );
}
