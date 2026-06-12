import { Button, FieldLabel, IconButton, Input, toast } from "@repo/ui";
import { ResponsiveGridEditor } from "@repo/ui-builder-react";
import {
  setRootColumnCount,
  updateRootNodeStyles,
} from "@repo/ui-builder-core";
import { cn } from "@repo/theme/utils";
import { LayoutTemplate } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { responsiveGridEditorLabels } from "../ui-builder/responsive-grid-editor-labels";
import { useFormDesigner } from "./form-designer-context";
import { getFormDesignerOuterLayout } from "./form-designer-layout";
import { FormDesignerLayoutPreview } from "./FormDesignerLayoutPreview";

const MAX_ROOT_COLUMNS = 6;

export function FormDesignerLayoutTab() {
  const { t } = useTranslation("common");
  const {
    editor,
    canSave,
    layoutIsDirty,
    saveLayout,
    rootLayoutPanelOpen,
    requestRootLayoutPanel,
  } = useFormDesigner();
  const { layout, setLayout } = getFormDesignerOuterLayout(editor);
  const responsiveGridLabels = useMemo(
    () => responsiveGridEditorLabels(t),
    [t],
  );

  const handleSave = async () => {
    if (!canSave || !layoutIsDirty) {
      return;
    }

    const error = await saveLayout();
    if (!error) {
      toast.success(t("entity.viewSettings.saved"));
    } else {
      toast.error(error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-start gap-4">
          <div className="flex w-24 flex-col gap-1">
            <FieldLabel htmlFor="form-designer-layout-columns">
              {t("entity.viewSettings.layoutColumns")}
            </FieldLabel>
            <Input
              id="form-designer-layout-columns"
              type="number"
              min={1}
              max={MAX_ROOT_COLUMNS}
              value={layout.root.columnCount}
              onChange={(event) => {
                const count = Number.parseInt(event.target.value, 10);
                if (!Number.isFinite(count)) {
                  return;
                }
                setLayout(setRootColumnCount(layout, count));
              }}
            />
          </div>

          {layout.root.columnCount >= 1 ? (
            <div className="flex items-end gap-1">
              <ResponsiveGridEditor
                styles={layout.root.styles}
                columnCount={layout.root.columnCount}
                labels={responsiveGridLabels}
                onChange={(styles) =>
                  setLayout(updateRootNodeStyles(layout, styles))
                }
              />
              <IconButton
                type="button"
                size="sm"
                label={t("formDesigner.layout.rootLayoutPanel.open")}
                className={cn(
                  rootLayoutPanelOpen &&
                    "bg-hover/80 text-foreground hover:text-foreground",
                )}
                onClick={() => requestRootLayoutPanel()}
              >
                <LayoutTemplate className="size-4" />
              </IconButton>
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          className="shrink-0"
          loading={editor.isSaving}
          disabled={!canSave || !layoutIsDirty}
          onClick={() => void handleSave()}
        >
          {t("entity.viewSettings.save")}
        </Button>
      </div>

      <FormDesignerLayoutPreview />
    </div>
  );
}
