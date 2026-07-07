import type {
  DashboardSectionComponentConfig,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import { FieldLabel, Text } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { useTranslation } from "react-i18next";

import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";

interface DashboardSectionComponentEditorProps {
  readonly config: DashboardSectionComponentConfig;
  readonly onChange: (config: UiComponentConfig) => void;
}

export function DashboardSectionComponentEditor({
  config,
  onChange,
}: DashboardSectionComponentEditorProps) {
  const { t } = useTranslation("common");
  const { editor } = useDashboardLayoutDesigner();
  const sections = editor.dashboardSections;

  const handleSectionChange = (sectionId: string) => {
    const section = sections.find((item) => item.id === sectionId);
    onChange({
      ...config,
      sectionId,
      label: section?.name,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="dashboard-section-select">
          {t("dashboardLayoutDesigner.sectionComponent.section")}
        </FieldLabel>
        {sections.length === 0 ? (
          <Text className="text-muted-foreground text-sm">
            {t("dashboardLayoutDesigner.sectionComponent.noSections")}
          </Text>
        ) : (
          <Select
            id="dashboard-section-select"
            className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-sm"
            value={config.sectionId}
            onChange={(event) => handleSectionChange(event.target.value)}
          >
            <option value="">
              {t("dashboardLayoutDesigner.sectionComponent.selectSection")}
            </option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </Select>
        )}
      </div>
    </div>
  );
}
