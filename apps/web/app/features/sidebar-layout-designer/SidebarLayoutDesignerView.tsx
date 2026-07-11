import { BuilderPageShell } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { SidebarLayoutDesignerHeaderActions } from "./SidebarLayoutDesignerHeaderActions";
import { SidebarLayoutDesignerProvider } from "./SidebarLayoutDesignerProvider";
import { SidebarLayoutDesignerTabs } from "./SidebarLayoutDesignerTabs";

function SidebarLayoutDesignerPageContent() {
  const { t } = useTranslation("common");

  return (
    <BuilderPageShell
      title={t("appShellDesigner.title")}
      subtitle={t("appShellDesigner.subtitle")}
      actions={<SidebarLayoutDesignerHeaderActions />}
      bodyScrollable={false}
    >
      <SidebarLayoutDesignerTabs />
    </BuilderPageShell>
  );
}

export function SidebarLayoutDesignerView() {
  return (
    <SidebarLayoutDesignerProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <SidebarLayoutDesignerPageContent />
      </div>
    </SidebarLayoutDesignerProvider>
  );
}
