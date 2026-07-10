import type {
  UiComponentConfig,
  ViewSearchComponentConfig,
} from "@repo/ui-builder-core";
import { LabelConfigEditor } from "@repo/ui-builder-react";
import { FieldLabel, Input } from "@repo/ui";
import { useTranslation } from "react-i18next";

interface ViewSearchComponentEditorProps {
  readonly config: ViewSearchComponentConfig;
  readonly onChange: (config: UiComponentConfig) => void;
}

export function ViewSearchComponentEditor({
  config,
  onChange,
}: ViewSearchComponentEditorProps) {
  const { t } = useTranslation("common");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        {t("viewFilterComponents.searchGlobalHint")}
      </p>
      <label className="flex flex-col gap-1">
        <FieldLabel>{t("viewFilterComponents.searchPlaceholder")}</FieldLabel>
        <Input
          value={config.placeholder ?? ""}
          onChange={(event) =>
            onChange({ ...config, placeholder: event.target.value })
          }
        />
      </label>
      <LabelConfigEditor
        label={config.label ?? { show: false }}
        onChange={(label) => onChange({ ...config, label })}
        labels={{
          showLabel: t("entity.viewSettings.showLabel"),
          label: t("viewFilterComponents.searchLabel"),
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
