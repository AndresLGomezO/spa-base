import { TabbedPanel } from "@repo/ui";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { DashboardLayoutDesignerTabId } from "./dashboard-layout-designer-tabs";
import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import { DashboardLayoutDesignerUnsavedChangesModal } from "./DashboardLayoutDesignerUnsavedChangesModal";
import { DashboardLayoutDesignerSectionsTab } from "./DashboardLayoutDesignerSectionsTab";
import { DashboardLayoutDesignerLayoutTab } from "./DashboardLayoutDesignerLayoutTab";

export function DashboardLayoutDesignerTabs() {
  const { t } = useTranslation("common");
  const { activeTabId, requestTabChange } = useDashboardLayoutDesigner();

  const tabs = useMemo(() => {
    const items: Array<{
      readonly id: DashboardLayoutDesignerTabId;
      readonly label: string;
      readonly panel: ReactNode;
      readonly panelScrollable?: boolean;
    }> = [
      {
        id: "sections",
        label: t("dashboardLayoutDesigner.tabs.sections"),
        panel: <DashboardLayoutDesignerSectionsTab />,
        panelScrollable: false,
      },
      {
        id: "layout",
        label: t("dashboardLayoutDesigner.tabs.layout"),
        panel: <DashboardLayoutDesignerLayoutTab />,
        panelScrollable: false,
      },
    ];

    return items;
  }, [t]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TabbedPanel
        ariaLabel={t("dashboardLayoutDesigner.tabs.ariaLabel")}
        activeTabId={activeTabId}
        onTabChange={(tabId) =>
          requestTabChange(tabId as DashboardLayoutDesignerTabId)
        }
        tabs={tabs}
        className="min-h-0 flex-1"
      />
      <DashboardLayoutDesignerUnsavedChangesModal />
    </div>
  );
}
