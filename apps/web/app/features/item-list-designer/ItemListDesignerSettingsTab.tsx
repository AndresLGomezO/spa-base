import { Button, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { LayoutSystemPresetPicker } from "../ui-builder/LayoutSystemPresetPicker";
import { useItemListDesigner } from "./item-list-designer-context";
import { ItemListDesignerPreviewPanel } from "./ItemListDesignerPreviewPanel";

const LIST_PRESET_SURFACES = ["listItem"] as const;

export function ItemListDesignerSettingsTab() {
  const { t } = useTranslation("common");
  const {
    editor,
    canSave,
    settingsIsDirty,
    layoutIsDirty,
    columnsIsDirty,
    saveSettings,
  } = useItemListDesigner();

  const handleSave = async () => {
    if (!canSave || !settingsIsDirty) {
      return;
    }

    const error = await saveSettings();
    if (!error) {
      toast.success(t("entity.viewSettings.saved"));
    } else {
      toast.error(error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <LayoutSystemPresetPicker
          entityName={editor.entityName}
          surfaces={LIST_PRESET_SURFACES}
          fieldPaths={editor.fieldPaths}
          value={editor.layoutPresetId}
          canApply={canSave}
          confirmOnReplace={layoutIsDirty || columnsIsDirty}
          onApplyBuiltin={(selection) =>
            editor.applyListSystemPreset(selection)
          }
          onApplyTenant={(preset, layout) =>
            editor.applyListSystemPreset({
              source: "tenant",
              preset,
              layout,
            })
          }
        />
        <Button
          type="button"
          className="ml-auto"
          loading={editor.isSaving}
          disabled={!canSave || !settingsIsDirty}
          onClick={() => void handleSave()}
        >
          {t("entity.viewSettings.save")}
        </Button>
      </div>

      <ItemListDesignerPreviewPanel />
    </div>
  );
}
