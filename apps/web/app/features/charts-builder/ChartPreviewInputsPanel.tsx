import { FieldLabel, Input, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { ViewFilterDateField } from "../ui-builder/ViewFilterDateField.js";
import type { ChartPreviewInputField } from "./chart-preview-input-model.js";

interface ChartPreviewInputsPanelProps {
  readonly fields: readonly ChartPreviewInputField[];
  readonly values: Record<string, string>;
  readonly onChange: (key: string, value: string) => void;
}

export function ChartPreviewInputsPanel({
  fields,
  values,
  onChange,
}: ChartPreviewInputsPanelProps) {
  const { t, i18n } = useTranslation("common");

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="border-border flex flex-col gap-3 rounded-md border p-3">
      <Text className="text-sm font-medium">
        {t("charts.workbench.previewInputs.title")}
      </Text>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => {
          if (field.kind === "dashboardDate" || field.kind === "dateBucket") {
            return (
              <label key={field.key} className="flex flex-col gap-1">
                <FieldLabel>
                  {field.kind === "dashboardDate"
                    ? t("charts.workbench.previewInputs.dashboardDate", {
                        parameter: field.label,
                      })
                    : field.label}
                </FieldLabel>
                <ViewFilterDateField
                  granularity={field.granularity}
                  value={values[field.key] ?? ""}
                  onChange={(value) => onChange(field.key, value)}
                  locale={i18n.language}
                  isExplicit
                />
              </label>
            );
          }

          if (field.kind === "stringList") {
            return (
              <label
                key={field.key}
                className="flex flex-col gap-1 sm:col-span-2"
              >
                <FieldLabel>{field.label}</FieldLabel>
                <Input
                  value={values[field.key] ?? ""}
                  placeholder={t(
                    "charts.workbench.previewInputs.stringListPlaceholder",
                  )}
                  onChange={(event) => onChange(field.key, event.target.value)}
                />
                <Text className="text-muted-foreground text-xs">
                  {t("charts.workbench.previewInputs.stringListHint")}
                </Text>
              </label>
            );
          }

          return (
            <label key={field.key} className="flex flex-col gap-1">
              <FieldLabel>{field.label}</FieldLabel>
              <Input
                value={values[field.key] ?? ""}
                onChange={(event) => onChange(field.key, event.target.value)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
