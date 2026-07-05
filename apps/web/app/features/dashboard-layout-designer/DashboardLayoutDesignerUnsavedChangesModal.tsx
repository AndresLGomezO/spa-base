import { Button, Modal, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";

export function DashboardLayoutDesignerUnsavedChangesModal() {
  const { t } = useTranslation("common");
  const {
    unsavedChangesOpen,
    unsavedReason,
    unsavedDesignFocus,
    editor,
    confirmUnsavedSave,
    confirmUnsavedDiscard,
    cancelUnsavedChanges,
  } = useDashboardLayoutDesigner();

  const messageKey =
    unsavedReason === "structurePanel"
      ? "dashboardLayoutDesigner.unsavedChanges.structurePanelMessage"
      : unsavedReason === "section"
        ? "dashboardLayoutDesigner.unsavedChanges.sectionMessage"
        : unsavedDesignFocus === "shell"
          ? "dashboardLayoutDesigner.unsavedChanges.layoutMessage"
          : "dashboardLayoutDesigner.unsavedChanges.sectionsMessage";

  const saveLabelKey =
    unsavedReason === "structurePanel"
      ? "dashboardLayoutDesigner.unsavedChanges.structurePanelSave"
      : "dashboardLayoutDesigner.unsavedChanges.save";

  return (
    <Modal
      open={unsavedChangesOpen}
      onClose={cancelUnsavedChanges}
      title={t("dashboardLayoutDesigner.unsavedChanges.title")}
    >
      <Text>{t(messageKey)}</Text>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          loading={
            unsavedReason === "tab" || unsavedReason === "section"
              ? editor.isSaving
              : false
          }
          onClick={() => void confirmUnsavedSave()}
        >
          {t(saveLabelKey)}
        </Button>
        <Button type="button" variant="outline" onClick={confirmUnsavedDiscard}>
          {t("dashboardLayoutDesigner.unsavedChanges.discard")}
        </Button>
        <Button type="button" variant="ghost" onClick={cancelUnsavedChanges}>
          {t("dashboardLayoutDesigner.unsavedChanges.keepEditing")}
        </Button>
      </div>
    </Modal>
  );
}
