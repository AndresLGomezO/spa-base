import { Button, Modal, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useMetricsRowDesigner } from "./metrics-row-designer-context";

export function MetricsRowDesignerUnsavedChangesModal() {
  const { t } = useTranslation("common");
  const {
    unsavedChangesOpen,
    unsavedReason,
    unsavedTabId,
    editor,
    confirmUnsavedSave,
    confirmUnsavedDiscard,
    cancelUnsavedChanges,
  } = useMetricsRowDesigner();

  const messageKey =
    unsavedReason === "structurePanel"
      ? "metricsRowDesigner.unsavedChanges.structurePanelMessage"
      : unsavedReason === "widget"
        ? "metricsRowDesigner.unsavedChanges.widgetMessage"
        : unsavedTabId === "row"
          ? "metricsRowDesigner.unsavedChanges.rowMessage"
          : "metricsRowDesigner.unsavedChanges.widgetsMessage";

  const saveLabelKey =
    unsavedReason === "structurePanel"
      ? "metricsRowDesigner.unsavedChanges.structurePanelSave"
      : "metricsRowDesigner.unsavedChanges.save";

  return (
    <Modal
      open={unsavedChangesOpen}
      onClose={cancelUnsavedChanges}
      title={t("metricsRowDesigner.unsavedChanges.title")}
    >
      <Text>{t(messageKey)}</Text>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          loading={
            unsavedReason === "tab" || unsavedReason === "widget"
              ? editor.isSaving
              : false
          }
          onClick={() => void confirmUnsavedSave()}
        >
          {t(saveLabelKey)}
        </Button>
        <Button type="button" variant="outline" onClick={confirmUnsavedDiscard}>
          {t("metricsRowDesigner.unsavedChanges.discard")}
        </Button>
        <Button type="button" variant="ghost" onClick={cancelUnsavedChanges}>
          {t("metricsRowDesigner.unsavedChanges.keepEditing")}
        </Button>
      </div>
    </Modal>
  );
}
