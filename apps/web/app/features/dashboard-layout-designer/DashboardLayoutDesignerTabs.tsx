import { TabbedPanel } from "@repo/ui";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { DashboardLayoutDesignFocus } from "./dashboard-layout-designer-tabs";
import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import { DashboardLayoutDesignerUnsavedChangesModal } from "./DashboardLayoutDesignerUnsavedChangesModal";
import { DashboardLayoutDesignerSectionsTab } from "./DashboardLayoutDesignerSectionsTab";
import { DashboardLayoutDesignerLayoutTab } from "./DashboardLayoutDesignerLayoutTab";

export function DashboardLayoutDesignerTabs() {
  const { t } = useTranslation("common");
  const { designFocus, requestDesignFocusChange } =
    useDashboardLayoutDesigner();

  const tabs = useMemo(() => {
    const items: Array<{
      readonly id: DashboardLayoutDesignFocus;
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
        id: "shell",
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
        activeTabId={designFocus}
        onTabChange={(tabId) =>
          requestDesignFocusChange(tabId as DashboardLayoutDesignFocus)
        }
        tabs={tabs}
        className="min-h-0 flex-1"
      />
      <DashboardLayoutDesignerUnsavedChangesModal />
    </div>
  );
}
