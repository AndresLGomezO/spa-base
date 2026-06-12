import { TabbedPanel } from "@repo/ui";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { DetailViewDesignerTabId } from "./detail-view-designer-tabs";
import { useDetailViewDesigner } from "./detail-view-designer-context";
import { DetailViewDesignerLayoutTab } from "./DetailViewDesignerLayoutTab";
import { DetailViewDesignerSettingsTab } from "./DetailViewDesignerSettingsTab";
import { DetailViewDesignerUnsavedChangesModal } from "./DetailViewDesignerUnsavedChangesModal";

export function DetailViewDesignerTabs() {
  const { t } = useTranslation("common");
  const { activeTabId, requestTabChange } = useDetailViewDesigner();

  const tabs = useMemo(() => {
    const items: Array<{
      readonly id: DetailViewDesignerTabId;
      readonly label: string;
      readonly panel: ReactNode;
    }> = [
      {
        id: "settings",
        label: t("detailViewDesigner.tabs.settings"),
        panel: <DetailViewDesignerSettingsTab />,
      },
      {
        id: "layout",
        label: t("detailViewDesigner.tabs.layout"),
        panel: <DetailViewDesignerLayoutTab />,
      },
    ];

    return items;
  }, [t]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TabbedPanel
        ariaLabel={t("detailViewDesigner.tabs.ariaLabel")}
        activeTabId={activeTabId}
        onTabChange={(tabId) =>
          requestTabChange(tabId as DetailViewDesignerTabId)
        }
        tabs={tabs}
        className="min-h-0 flex-1"
      />
      <DetailViewDesignerUnsavedChangesModal />
    </div>
  );
}
