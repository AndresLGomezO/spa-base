import type {
  NavTabComponentConfig,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import { FieldLabel, Input } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { LucideIconField } from "../../components/shared/LucideIconField";

interface NavTabComponentEditorProps {
  readonly config: NavTabComponentConfig;
  readonly onChange: (config: UiComponentConfig) => void;
}

export function NavTabComponentEditor({
  config,
  onChange,
}: NavTabComponentEditorProps) {
  const { t } = useTranslation("common");

  return (
    <div className="flex flex-col gap-4">
      <LucideIconField
        id="nav-tab-icon"
        label={t("sidebarLayoutDesigner.navTabComponent.iconName")}
        hint={t("designLayout.iconNameHint")}
        value={config.iconName}
        onChange={(iconName) => onChange({ ...config, iconName })}
      />

      <div className="flex flex-col gap-1 text-sm">
        <FieldLabel htmlFor="nav-tab-label">
          {t("sidebarLayoutDesigner.navTabComponent.label")}
        </FieldLabel>
        <Input
          id="nav-tab-label"
          value={config.label ?? ""}
          onChange={(event) => {
            const raw = event.target.value;
            onChange({
              ...config,
              label: raw.trim().length > 0 ? raw : undefined,
            });
          }}
        />
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <FieldLabel htmlFor="nav-tab-to">
          {t("sidebarLayoutDesigner.navTabComponent.to")}
        </FieldLabel>
        <Input
          id="nav-tab-to"
          value={config.to}
          onChange={(event) => onChange({ ...config, to: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <FieldLabel htmlFor="nav-tab-match-path">
          {t("sidebarLayoutDesigner.navTabComponent.matchPath")}
        </FieldLabel>
        <Input
          id="nav-tab-match-path"
          value={config.matchPath ?? ""}
          onChange={(event) => {
            const raw = event.target.value.trim();
            onChange({
              ...config,
              matchPath: raw.length > 0 ? raw : undefined,
            });
          }}
        />
      </div>
    </div>
  );
}
