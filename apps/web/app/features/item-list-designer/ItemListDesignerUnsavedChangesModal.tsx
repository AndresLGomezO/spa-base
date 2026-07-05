import { Button, Modal, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useItemListDesigner } from "./item-list-designer-context";

export function ItemListDesignerUnsavedChangesModal() {
  const { t } = useTranslation("common");
  const {
    unsavedChangesOpen,
    unsavedTabId,
    unsavedReason,
    editor,
    confirmUnsavedSave,
    confirmUnsavedDiscard,
    cancelUnsavedChanges,
  } = useItemListDesigner();

  const messageKey =
    unsavedReason === "structurePanel"
      ? "itemListDesigner.unsavedChanges.structurePanelMessage"
      : unsavedReason === "columnsScope"
        ? "itemListDesigner.unsavedChanges.columnsScopeMessage"
        : unsavedTabId === "design"
          ? editor.viewType === "card"
            ? "itemListDesigner.unsavedChanges.layoutMessage"
            : "itemListDesigner.unsavedChanges.columnsMessage"
          : "itemListDesigner.unsavedChanges.settingsMessage";

  const saveLabelKey =
    unsavedReason === "structurePanel"
      ? "itemListDesigner.unsavedChanges.structurePanelSave"
      : unsavedReason === "columnsScope"
        ? "itemListDesigner.unsavedChanges.columnsScopeSave"
        : "itemListDesigner.unsavedChanges.save";

  return (
    <Modal
      open={unsavedChangesOpen}
      onClose={cancelUnsavedChanges}
      title={t("itemListDesigner.unsavedChanges.title")}
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
          {t("itemListDesigner.unsavedChanges.discard")}
        </Button>
        <Button type="button" variant="ghost" onClick={cancelUnsavedChanges}>
          {t("itemListDesigner.unsavedChanges.keepEditing")}
        </Button>
      </div>
    </Modal>
  );
}
