import type {
  SidebarNavComponentConfig,
  SidebarNavItemTemplate,
  SidebarNavTemplateKey,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import { CollapsibleStyleRulesEditor } from "@repo/ui-builder-react";
import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useFormDesignerLayoutEditorLabels } from "../form-designer/form-designer-layout-editor-labels";

interface SidebarNavComponentEditorProps {
  readonly config: SidebarNavComponentConfig;
  readonly onChange: (config: UiComponentConfig) => void;
}

const TEMPLATE_KEYS: readonly SidebarNavTemplateKey[] = [
  "groupItem",
  "subgroupItem",
  "rawItem",
];

export function SidebarNavComponentEditor({
  config,
  onChange,
}: SidebarNavComponentEditorProps) {
  const { t } = useTranslation("common");
  const labels = useFormDesignerLayoutEditorLabels();

  const updateTemplate = (
    key: SidebarNavTemplateKey,
    template: SidebarNavItemTemplate,
  ) => {
    onChange({
      ...config,
      [key]: template,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Text className="text-muted-foreground text-sm">
        {t("sidebarLayoutDesigner.navComponent.templatesHint")}
      </Text>

      {TEMPLATE_KEYS.map((key) => {
        const template = config[key];
        const titleKey =
          key === "groupItem"
            ? "sidebarLayoutDesigner.navComponent.groupItemStyles"
            : key === "subgroupItem"
              ? "sidebarLayoutDesigner.navComponent.subgroupItemStyles"
              : "sidebarLayoutDesigner.navComponent.rawItemStyles";

        return (
          <CollapsibleStyleRulesEditor
            key={key}
            title={t(titleKey)}
            styles={template.styles}
            onChange={(styles) =>
              updateTemplate(key, {
                ...template,
                styles: styles.length > 0 ? styles : undefined,
              })
            }
            labels={labels.styleRules}
          />
        );
      })}
    </div>
  );
}
