import type {
  SidebarCollapseComponentConfig,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import { FieldLabel, Input } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { LayoutLucideIcon } from "../../components/entity/LayoutLucideIcon";
import { LucideIconField } from "../../components/shared/LucideIconField";

interface SidebarCollapseComponentEditorProps {
  readonly config: SidebarCollapseComponentConfig;
  readonly onChange: (config: UiComponentConfig) => void;
}

export function SidebarCollapseComponentEditor({
  config,
  onChange,
}: SidebarCollapseComponentEditorProps) {
  const { t } = useTranslation("common");
  const iconSize = config.iconSize ?? 16;
  const expandedIconName = config.iconName ?? "PanelLeftClose";
  const collapsedIconName = config.expandIconName ?? "PanelLeft";

  return (
    <div className="flex flex-col gap-4">
      <LucideIconField
        id="sidebar-collapse-icon"
        label={t("sidebarLayoutDesigner.collapseComponent.iconName")}
        hint={t("sidebarLayoutDesigner.collapseComponent.iconNameHint")}
        value={expandedIconName}
        onChange={(iconName) => onChange({ ...config, iconName })}
      />

      <LucideIconField
        id="sidebar-collapse-expand-icon"
        label={t("sidebarLayoutDesigner.collapseComponent.expandIconName")}
        hint={t("sidebarLayoutDesigner.collapseComponent.expandIconNameHint")}
        value={collapsedIconName}
        onChange={(expandIconName) => onChange({ ...config, expandIconName })}
      />

      <div className="flex flex-col gap-1 text-sm">
        <FieldLabel htmlFor="sidebar-collapse-icon-size">
          {t("sidebarLayoutDesigner.collapseComponent.iconSize")}
        </FieldLabel>
        <Input
          id="sidebar-collapse-icon-size"
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

      <div className="flex flex-col gap-2 text-sm">
        <FieldLabel>
          {t("sidebarLayoutDesigner.collapseComponent.statePreview")}
        </FieldLabel>
        <div className="border-border flex gap-3 rounded-md border p-3">
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-muted-foreground text-xs">
              {t("sidebarLayoutDesigner.collapseComponent.stateExpanded")}
            </span>
            <span className="bg-sidebar text-sidebar-foreground inline-flex size-8 items-center justify-center rounded-md">
              <LayoutLucideIcon
                config={{
                  kind: "icon",
                  iconName: expandedIconName,
                  iconSize,
                }}
              />
            </span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-muted-foreground text-xs">
              {t("sidebarLayoutDesigner.collapseComponent.stateCollapsed")}
            </span>
            <span className="bg-sidebar text-sidebar-foreground inline-flex size-8 items-center justify-center rounded-md">
              <LayoutLucideIcon
                config={{
                  kind: "icon",
                  iconName: collapsedIconName,
                  iconSize,
                }}
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
