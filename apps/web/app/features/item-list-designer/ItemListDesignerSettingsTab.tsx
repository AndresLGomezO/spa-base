import {
  Button,
  SegmentedSwitch,
  toast,
  type SegmentedSwitchOption,
} from "@repo/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useItemListDesigner } from "./item-list-designer-context";
import { ItemListDesignerPreviewPanel } from "./ItemListDesignerPreviewPanel";

export function ItemListDesignerSettingsTab() {
  const { t } = useTranslation("common");
  const { editor, canSave, settingsIsDirty, saveSettings } =
    useItemListDesigner();

  const presentationOptions = useMemo(
    (): readonly SegmentedSwitchOption<
      "table" | "card" | "expandableTable"
    >[] => [
      {
        value: "table",
        label: t("entity.viewSettings.table"),
        ariaLabel: t("entity.viewSettings.table"),
      },
      {
        value: "expandableTable",
        label: t("designLayout.presentationExpandableTable"),
        ariaLabel: t("designLayout.presentationExpandableTable"),
      },
      {
        value: "card",
        label: t("entity.viewSettings.card"),
        ariaLabel: t("entity.viewSettings.card"),
      },
    ],
    [t],
  );

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
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-muted-foreground text-sm">
            {t("designLayout.presentation")}
          </span>
          <SegmentedSwitch
            value={editor.viewType}
            options={presentationOptions}
            onChange={(value) => editor.setViewType(value)}
            ariaLabel={t("designLayout.presentation")}
          />
        </div>
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
