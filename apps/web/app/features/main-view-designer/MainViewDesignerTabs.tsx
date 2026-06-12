import { TabbedPanel } from "@repo/ui";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { MainViewDesignerTabId } from "./main-view-designer-tabs";
import { useMainViewDesigner } from "./main-view-designer-context";
import { MainViewDesignerLayoutTab } from "./MainViewDesignerLayoutTab";
import { MainViewDesignerSettingsTab } from "./MainViewDesignerSettingsTab";
import { MainViewDesignerUnsavedChangesModal } from "./MainViewDesignerUnsavedChangesModal";

export function MainViewDesignerTabs() {
  const { t } = useTranslation("common");
  const { activeTabId, requestTabChange } = useMainViewDesigner();

  const tabs = useMemo(() => {
    const items: Array<{
      readonly id: MainViewDesignerTabId;
      readonly label: string;
      readonly panel: ReactNode;
    }> = [
      {
        id: "settings",
        label: t("mainViewDesigner.tabs.settings"),
        panel: <MainViewDesignerSettingsTab />,
      },
      {
        id: "layout",
        label: t("mainViewDesigner.tabs.layout"),
        panel: <MainViewDesignerLayoutTab />,
      },
    ];

    return items;
  }, [t]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TabbedPanel
        ariaLabel={t("mainViewDesigner.tabs.ariaLabel")}
        activeTabId={activeTabId}
        onTabChange={(tabId) =>
          requestTabChange(tabId as MainViewDesignerTabId)
        }
        tabs={tabs}
        className="min-h-0 flex-1"
      />
      <MainViewDesignerUnsavedChangesModal />
    </div>
  );
}
