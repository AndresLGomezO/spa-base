import { useMemo } from "react";
import { Button, FieldLabel, Select, Switch, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useItemListDesigner } from "./item-list-designer-context";
import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { ItemListDesignerExpandableColumnsTreePanel } from "./ItemListDesignerExpandableColumnsTreePanel";
import { ItemListDesignerPreviewPanel } from "./ItemListDesignerPreviewPanel";
import { ItemListDesignerStructureSessionProvider } from "./ItemListDesignerStructureSession";

const SUMMARY_FIELD_INHERIT = "__inherit__";

export function ItemListDesignerExpandableColumnsTab() {
  const { t } = useTranslation("common");
  const { editor, canSave, columnsIsDirty, saveColumns } =
    useItemListDesigner();

  const stringFieldOptions = useMemo(
    () =>
      Object.entries(editor.definition.fields)
        .filter(([, meta]) => meta.type === "string")
        .map(([name]) => ({ value: name, label: name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [editor.definition.fields],
  );

  const detailSummaryField =
    editor.definition.ui.recordDetailLayout?.summaryField?.trim() ||
    editor.definition.ui.detailLayout?.summaryField?.trim() ||
    "";

  const summarySelectValue =
    editor.expandableSummaryField === undefined
      ? SUMMARY_FIELD_INHERIT
      : editor.expandableSummaryField;

  const handleSave = async () => {
    if (!canSave || !columnsIsDirty) {
      return;
    }

    const error = await saveColumns();
    if (!error) {
      toast.success(t("entity.viewSettings.saved"));
    } else {
      toast.error(error);
    }
  };

  return (
    <div className={designerTreeTabRootClassName}>
      <div className="flex shrink-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Switch
            variant="ios"
            checked={editor.expandableShowActions}
            onChange={(checked) => editor.setExpandableShowActions(checked)}
            label={t("entity.viewSettings.showActions")}
          />
          <Button
            type="button"
            className="shrink-0"
            loading={editor.isSaving}
            disabled={!canSave || !columnsIsDirty}
            onClick={() => void handleSave()}
          >
            {t("entity.viewSettings.save")}
          </Button>
        </div>

        <div className="bg-card border-border flex max-w-md flex-col gap-2 rounded-lg border p-3">
          <FieldLabel htmlFor="expandable-summary-field">
            {t("entity.viewSettings.summaryField.label")}
          </FieldLabel>
          <Select
            id="expandable-summary-field"
            value={summarySelectValue}
            onChange={(event) => {
              const next = event.target.value;
              if (next === SUMMARY_FIELD_INHERIT) {
                editor.setExpandableSummaryField(undefined);
                return;
              }
              editor.setExpandableSummaryField(next);
            }}
            aria-label={t("entity.viewSettings.summaryField.label")}
          >
            <option value={SUMMARY_FIELD_INHERIT}>
              {detailSummaryField
                ? t("entity.viewSettings.summaryField.inherit", {
                    field: detailSummaryField,
                  })
                : t("entity.viewSettings.summaryField.inheritNone")}
            </option>
            <option value="">
              {t("entity.viewSettings.summaryField.none")}
            </option>
            {stringFieldOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <p className="text-muted-foreground text-xs">
            {t("entity.viewSettings.summaryField.help")}
          </p>
        </div>
      </div>

      <ItemListDesignerStructureSessionProvider>
        <div className={designerTreeWorkbenchClassName}>
          <ItemListDesignerExpandableColumnsTreePanel />

          <div className={designerPreviewColumnClassName}>
            <ItemListDesignerPreviewPanel fillHeight />
          </div>
        </div>
      </ItemListDesignerStructureSessionProvider>
    </div>
  );
}
