import { TabbedPanel } from "@repo/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { FormDesignerTabId } from "./form-designer-tabs";
import { useFormDesigner } from "./form-designer-context";
import { FormDesignerLayoutTab } from "./FormDesignerLayoutTab";
import { FormDesignerSettingsTab } from "./FormDesignerSettingsTab";
import { FormDesignerComponentsTab } from "./FormDesignerComponentsTab";
import { FormDesignerUnsavedChangesModal } from "./FormDesignerUnsavedChangesModal";

export function FormDesignerTabs() {
  const { t } = useTranslation("common");
  const { activeTabId, requestTabChange } = useFormDesigner();

  const tabs = useMemo(
    () => [
      {
        id: "settings" as const,
        label: t("formDesigner.tabs.settings"),
        panel: <FormDesignerSettingsTab />,
      },
      {
        id: "layout" as const,
        label: t("formDesigner.tabs.layout"),
        panel: <FormDesignerLayoutTab />,
      },
      {
        id: "components" as const,
        label: t("formDesigner.tabs.components"),
        panel: <FormDesignerComponentsTab />,
      },
    ],
    [t],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TabbedPanel
        ariaLabel={t("formDesigner.tabs.ariaLabel")}
        activeTabId={activeTabId}
        onTabChange={(tabId) => requestTabChange(tabId as FormDesignerTabId)}
        tabs={tabs}
        className="min-h-0 flex-1"
      />
      <FormDesignerUnsavedChangesModal />
    </div>
  );
}
