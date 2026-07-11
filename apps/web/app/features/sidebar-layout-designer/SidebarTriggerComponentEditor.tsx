import type {
  SidebarTriggerComponentConfig,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import { FieldLabel, Input } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { LucideIconField } from "../../components/shared/LucideIconField";

interface SidebarTriggerComponentEditorProps {
  readonly config: SidebarTriggerComponentConfig;
  readonly onChange: (config: UiComponentConfig) => void;
}

export function SidebarTriggerComponentEditor({
  config,
  onChange,
}: SidebarTriggerComponentEditorProps) {
  const { t } = useTranslation("common");

  return (
    <div className="flex flex-col gap-4">
      <LucideIconField
        id="sidebar-trigger-icon"
        label={t("sidebarLayoutDesigner.triggerComponent.iconName")}
        hint={t("sidebarLayoutDesigner.triggerComponent.iconNameHint")}
        value={config.iconName ?? "PanelLeft"}
        onChange={(iconName) => onChange({ ...config, iconName })}
      />

      <div className="flex flex-col gap-1 text-sm">
        <FieldLabel htmlFor="sidebar-trigger-icon-size">
          {t("sidebarLayoutDesigner.triggerComponent.iconSize")}
        </FieldLabel>
        <Input
          id="sidebar-trigger-icon-size"
          type="number"
          min={12}
          max={96}
          value={config.iconSize ?? ""}
          placeholder="16"
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (raw.length === 0) {
              onChange({ ...config, iconSize: undefined });
              return;
            }
            const parsed = Number.parseInt(raw, 10);
            if (!Number.isFinite(parsed)) {
              return;
            }
            onChange({ ...config, iconSize: parsed });
          }}
        />
      </div>
    </div>
  );
}
