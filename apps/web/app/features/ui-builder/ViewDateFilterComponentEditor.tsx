import type {
  UiComponentConfig,
  ViewDateFilterComponentConfig,
  ViewFilterDateGranularity,
} from "@repo/ui-builder-core";
import { defaultDateFilterParam } from "@repo/ui-builder-core";
import { LabelConfigEditor } from "@repo/ui-builder-react";
import { FieldLabel, Input } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { useTranslation } from "react-i18next";

interface ViewDateFilterComponentEditorProps {
  readonly config: ViewDateFilterComponentConfig;
  readonly onChange: (config: UiComponentConfig) => void;
}

export function ViewDateFilterComponentEditor({
  config,
  onChange,
}: ViewDateFilterComponentEditorProps) {
  const { t } = useTranslation("common");
  const dateFilterGranularity = config.dateFilterGranularity ?? "month";

  const updateConfig = (patch: Partial<ViewDateFilterComponentConfig>) => {
    onChange({
      ...config,
      ...patch,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <FieldLabel>
          {t("viewFilterComponents.dateFilterGranularity")}
        </FieldLabel>
        <Select
          value={dateFilterGranularity}
          onChange={(event) => {
            const nextGranularity = event.target
              .value as ViewFilterDateGranularity;
            updateConfig({
              dateFilterGranularity: nextGranularity,
              dateFilterParam: defaultDateFilterParam(nextGranularity),
            });
          }}
        >
          <option value="year">
            {t("viewFilterComponents.dateFilterGranularityYear")}
          </option>
          <option value="month">
            {t("viewFilterComponents.dateFilterGranularityMonth")}
          </option>
          <option value="day">
            {t("viewFilterComponents.dateFilterGranularityDay")}
          </option>
        </Select>
      </label>
      <label className="flex flex-col gap-1">
        <FieldLabel>{t("viewFilterComponents.dateFilterParam")}</FieldLabel>
        <Input
          value={
            config.dateFilterParam ??
            defaultDateFilterParam(dateFilterGranularity)
          }
          onChange={(event) =>
            updateConfig({ dateFilterParam: event.target.value })
          }
        />
      </label>
      <LabelConfigEditor
        label={config.label ?? { show: true }}
        onChange={(label) => updateConfig({ label })}
        labels={{
          showLabel: t("entity.viewSettings.showLabel"),
          label: t("viewFilterComponents.dateFilterLabel"),
          labelPosition: t("entity.viewSettings.labelPosition"),
          labelAbove: t("entity.viewSettings.labelAbove"),
          labelBelow: t("entity.viewSettings.labelBelow"),
          labelAlignLeft: t("entity.viewSettings.labelAlignLeft"),
          labelAlignCenter: t("entity.viewSettings.labelAlignCenter"),
          labelAlignRight: t("entity.viewSettings.labelAlignRight"),
          labelColor: t("entity.viewSettings.labelColor"),
        }}
      />
    </div>
  );
}
