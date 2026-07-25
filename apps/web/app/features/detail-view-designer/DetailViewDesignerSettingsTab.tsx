import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FieldLabel, Select } from "@repo/ui";

import { DetailViewDesignerUnifiedPreviewPanel } from "./DetailViewDesignerUnifiedPreviewPanel";
import { useDetailViewDesigner } from "./detail-view-designer-context";

export function DetailViewDesignerSettingsTab() {
  const { t } = useTranslation("common");
  const { editor } = useDetailViewDesigner();

  const stringFieldOptions = useMemo(() => {
    const fields = editor.definition.fields;
    return Object.entries(fields)
      .filter(([, meta]) => meta.type === "string")
      .map(([name]) => ({ value: name, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [editor.definition.fields]);

  const summaryFieldValue = editor.layout.summaryField?.trim() ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card border-border flex max-w-md flex-col gap-2 rounded-lg border p-4">
        <FieldLabel htmlFor="detail-summary-field">
          {t("detailViewDesigner.summaryField.label")}
        </FieldLabel>
        <Select
          id="detail-summary-field"
          value={summaryFieldValue}
          onChange={(event) => {
            const next = event.target.value.trim();
            const { summaryField: _ignoredSummaryField, ...rest } =
              editor.layout;
            void _ignoredSummaryField;
            editor.setLayout(
              next.length > 0 ? { ...editor.layout, summaryField: next } : rest,
            );
          }}
          aria-label={t("detailViewDesigner.summaryField.label")}
        >
          <option value="">{t("detailViewDesigner.summaryField.none")}</option>
          {stringFieldOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <p className="text-muted-foreground text-xs">
          {t("detailViewDesigner.summaryField.help")}
        </p>
      </div>
      <DetailViewDesignerUnifiedPreviewPanel />
    </div>
  );
}
