import { TabbedPanel } from "@repo/ui";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { AppShellDesignFocus } from "./app-shell-designer-tabs";
import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";
import { FooterLayoutTab } from "./FooterLayoutTab";
import { HeaderLayoutTab } from "./HeaderLayoutTab";
import { SidebarLayoutDesignerLayoutTab } from "./SidebarLayoutDesignerLayoutTab";
import { SidebarLayoutDesignerUnsavedChangesModal } from "./SidebarLayoutDesignerUnsavedChangesModal";

export function SidebarLayoutDesignerTabs() {
  const { t } = useTranslation("common");
  const { designFocus, requestDesignFocusChange } = useSidebarLayoutDesigner();

  const tabs = useMemo(() => {
    const items: Array<{
      readonly id: AppShellDesignFocus;
      readonly label: string;
      readonly panel: ReactNode;
      readonly panelScrollable?: boolean;
    }> = [
      {
        id: "sidebar",
        label: t("sidebarLayoutDesigner.tabs.sidebar"),
        panel: <SidebarLayoutDesignerLayoutTab />,
        panelScrollable: false,
      },
      {
        id: "header",
        label: t("sidebarLayoutDesigner.tabs.header"),
        panel: <HeaderLayoutTab />,
        panelScrollable: false,
      },
      {
        id: "footer",
        label: t("sidebarLayoutDesigner.tabs.footer"),
        panel: <FooterLayoutTab />,
        panelScrollable: false,
      },
    ];

    return items;
  }, [t]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TabbedPanel
        ariaLabel={t("sidebarLayoutDesigner.tabs.ariaLabel")}
        activeTabId={designFocus}
        onTabChange={(tabId) =>
          requestDesignFocusChange(tabId as AppShellDesignFocus)
        }
        tabs={tabs}
        className="min-h-0 flex-1"
      />
      <SidebarLayoutDesignerUnsavedChangesModal />
    </div>
  );
}
