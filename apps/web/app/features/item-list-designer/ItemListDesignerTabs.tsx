import { TabbedPanel } from "@repo/ui";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { ItemListDesignerTabId } from "./item-list-designer-tabs";
import { useItemListDesigner } from "./item-list-designer-context";
import { ItemListDesignerColumnsTab } from "./ItemListDesignerColumnsTab";
import { ItemListDesignerLayoutTab } from "./ItemListDesignerLayoutTab";
import { ItemListDesignerSettingsTab } from "./ItemListDesignerSettingsTab";
import { ItemListDesignerUnsavedChangesModal } from "./ItemListDesignerUnsavedChangesModal";

export function ItemListDesignerTabs() {
  const { t } = useTranslation("common");
  const { activeTabId, requestTabChange, editor } = useItemListDesigner();

  const tabs = useMemo(() => {
    const items: Array<{
      readonly id: ItemListDesignerTabId;
      readonly label: string;
      readonly panel: ReactNode;
      readonly panelScrollable?: boolean;
    }> = [
      {
        id: "settings",
        label: t("itemListDesigner.tabs.settings"),
        panel: <ItemListDesignerSettingsTab />,
      },
    ];

    if (editor.viewType === "table" || editor.viewType === "expandableTable") {
      items.push({
        id: "columns",
        label: t("itemListDesigner.tabs.columns"),
        panel: <ItemListDesignerColumnsTab />,
        panelScrollable: false,
      });
    }

    if (editor.viewType === "card") {
      items.push({
        id: "layout",
        label: t("itemListDesigner.tabs.layout"),
        panel: <ItemListDesignerLayoutTab />,
        panelScrollable: false,
      });
    }

    return items;
  }, [editor.viewType, t]);

  const effectiveActiveTabId =
    activeTabId === "columns" && editor.viewType === "card"
      ? "settings"
      : activeTabId === "layout" && editor.viewType !== "card"
        ? "settings"
        : activeTabId;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TabbedPanel
        ariaLabel={t("itemListDesigner.tabs.ariaLabel")}
        activeTabId={effectiveActiveTabId}
        onTabChange={(tabId) =>
          requestTabChange(tabId as ItemListDesignerTabId)
        }
        tabs={tabs}
        className="min-h-0 flex-1"
      />
      <ItemListDesignerUnsavedChangesModal />
    </div>
  );
}
