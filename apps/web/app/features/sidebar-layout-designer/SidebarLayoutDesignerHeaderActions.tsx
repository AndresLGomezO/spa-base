import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Modal, Text } from "@repo/ui";

import { SidebarLayoutDesignerHeaderSettingsMenu } from "./SidebarLayoutDesignerHeaderSettingsMenu";
import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";

export function SidebarLayoutDesignerHeaderActions() {
  const { t } = useTranslation("common");
  const { editor, canSave, resetToPlatformDefault } =
    useSidebarLayoutDesigner();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canReset = canSave && editor.hasTenantOverride && !editor.isSaving;

  const handleReset = async () => {
    setError(null);
    const message = await resetToPlatformDefault();
    if (message) {
      setError(message);
      return;
    }
    setConfirmOpen(false);
  };

  return (
    <div className="flex items-end gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canReset}
        onClick={() => {
          setError(null);
          setConfirmOpen(true);
        }}
      >
        <RotateCcw className="size-3.5" aria-hidden />
        {t("sidebarLayoutDesigner.resetToPlatform")}
      </Button>
      <SidebarLayoutDesignerHeaderSettingsMenu />

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("sidebarLayoutDesigner.resetToPlatformTitle")}
      >
        <div className="flex flex-col gap-3">
          <Text className="text-muted-foreground text-sm">
            {t("sidebarLayoutDesigner.resetToPlatformMessage")}
          </Text>
          {error ? (
            <Text className="text-destructive text-sm">{error}</Text>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              {t("sidebarLayoutDesigner.unsavedChanges.keepEditing")}
            </Button>
            <Button
              type="button"
              disabled={editor.isSaving}
              onClick={() => void handleReset()}
            >
              {t("sidebarLayoutDesigner.resetToPlatformConfirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
