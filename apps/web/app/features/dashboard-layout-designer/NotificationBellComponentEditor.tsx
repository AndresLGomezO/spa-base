import type {
  NotificationBellComponentConfig,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import { LabelConfigEditor } from "@repo/ui-builder-react";
import { Input } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { LucideIconField } from "../../components/shared/LucideIconField";
import { useFormDesignerComponentEditorLabels } from "../form-designer/form-designer-component-editor-labels";

interface NotificationBellComponentEditorProps {
  readonly config: NotificationBellComponentConfig;
  readonly onChange: (config: UiComponentConfig) => void;
}

export function NotificationBellComponentEditor({
  config,
  onChange,
}: NotificationBellComponentEditorProps) {
  const { t } = useTranslation("common");
  const componentEditorLabels = useFormDesignerComponentEditorLabels();

  return (
    <div className="flex flex-col gap-4">
      <LucideIconField
        id="dashboard-notification-bell-icon"
        label={t("dashboardLayoutDesigner.notificationBellComponent.iconName")}
        hint={t(
          "dashboardLayoutDesigner.notificationBellComponent.iconNameHint",
        )}
        value={config.iconName ?? "Bell"}
        onChange={(iconName) => onChange({ ...config, iconName })}
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          {t("dashboardLayoutDesigner.notificationBellComponent.iconSize")}
        </span>
        <Input
          type="number"
          min={12}
          max={96}
          value={config.iconSize ?? ""}
          placeholder="20"
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
          checked={config.showBadge !== false}
          onChange={(event) =>
            onChange({ ...config, showBadge: event.target.checked })
          }
        />
        <span>
          {t("dashboardLayoutDesigner.notificationBellComponent.showBadge")}
        </span>
      </label>

      <LabelConfigEditor
        label={config.label}
        labels={componentEditorLabels.label}
        onChange={(label) => onChange({ ...config, label })}
      />
    </div>
  );
}
