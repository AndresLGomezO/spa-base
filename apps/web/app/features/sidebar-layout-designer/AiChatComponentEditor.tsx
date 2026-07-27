import type {
  AiChatComponentConfig,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import { LabelConfigEditor } from "@repo/ui-builder-react";
import { Input } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { LucideIconField } from "../../components/shared/LucideIconField";
import { useFormDesignerComponentEditorLabels } from "../form-designer/form-designer-component-editor-labels";

interface AiChatComponentEditorProps {
  readonly config: AiChatComponentConfig;
  readonly onChange: (config: UiComponentConfig) => void;
}

export function AiChatComponentEditor({
  config,
  onChange,
}: AiChatComponentEditorProps) {
  const { t } = useTranslation("common");
  const componentEditorLabels = useFormDesignerComponentEditorLabels();

  return (
    <div className="flex flex-col gap-4">
      <LucideIconField
        id="footer-ai-chat-icon"
        label={t("sidebarLayoutDesigner.aiChatComponent.iconName")}
        hint={t("sidebarLayoutDesigner.aiChatComponent.iconNameHint")}
        value={config.iconName ?? "Bot"}
        onChange={(iconName) => onChange({ ...config, iconName })}
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          {t("sidebarLayoutDesigner.aiChatComponent.iconSize")}
        </span>
        <Input
          type="number"
          min={12}
          max={96}
          value={config.iconSize ?? ""}
          placeholder="24"
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
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.busyIndicator !== false}
          onChange={(event) =>
            onChange({ ...config, busyIndicator: event.target.checked })
          }
        />
        <span>{t("sidebarLayoutDesigner.aiChatComponent.busyIndicator")}</span>
      </label>

      <LabelConfigEditor
        label={config.label}
        labels={componentEditorLabels.label}
        onChange={(label) => onChange({ ...config, label })}
      />
    </div>
  );
}
