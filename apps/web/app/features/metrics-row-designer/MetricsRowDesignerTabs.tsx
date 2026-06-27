import { TabbedPanel } from "@repo/ui";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { MetricsRowDesignerTabId } from "./metrics-row-designer-tabs";
import { useMetricsRowDesigner } from "./metrics-row-designer-context";
import { MetricsRowDesignerUnsavedChangesModal } from "./MetricsRowDesignerUnsavedChangesModal";
import { MetricsRowDesignerWidgetsTab } from "./MetricsRowDesignerWidgetsTab";
import { MetricsRowDesignerRowTab } from "./MetricsRowDesignerRowTab";

export function MetricsRowDesignerTabs() {
  const { t } = useTranslation("common");
  const { activeTabId, requestTabChange } = useMetricsRowDesigner();

  const tabs = useMemo(() => {
    const items: Array<{
      readonly id: MetricsRowDesignerTabId;
      readonly label: string;
      readonly panel: ReactNode;
      readonly panelScrollable?: boolean;
    }> = [
      {
        id: "widgets",
        label: t("metricsRowDesigner.tabs.widgets"),
        panel: <MetricsRowDesignerWidgetsTab />,
        panelScrollable: false,
      },
      {
        id: "row",
        label: t("metricsRowDesigner.tabs.row"),
        panel: <MetricsRowDesignerRowTab />,
        panelScrollable: false,
      },
    ];

    return items;
  }, [t]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TabbedPanel
        ariaLabel={t("metricsRowDesigner.tabs.ariaLabel")}
        activeTabId={activeTabId}
        onTabChange={(tabId) =>
          requestTabChange(tabId as MetricsRowDesignerTabId)
        }
        tabs={tabs}
        className="min-h-0 flex-1"
      />
      <MetricsRowDesignerUnsavedChangesModal />
    </div>
  );
}
