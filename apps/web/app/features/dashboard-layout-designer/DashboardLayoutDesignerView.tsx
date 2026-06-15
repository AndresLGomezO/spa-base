import { BuilderPageShell } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { DashboardLayoutDesignerHeaderActions } from "./DashboardLayoutDesignerHeaderActions";
import { DashboardLayoutDesignerProvider } from "./DashboardLayoutDesignerProvider";
import { DashboardLayoutDesignerTabs } from "./DashboardLayoutDesignerTabs";

function DashboardLayoutDesignerPageContent() {
  const { t } = useTranslation("common");

  return (
    <BuilderPageShell
      title={t("dashboardLayoutDesigner.title")}
      subtitle={t("dashboardLayoutDesigner.subtitle")}
      actions={<DashboardLayoutDesignerHeaderActions />}
      bodyScrollable={false}
    >
      <DashboardLayoutDesignerTabs />
    </BuilderPageShell>
  );
}

export function DashboardLayoutDesignerView() {
  return (
    <DashboardLayoutDesignerProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <DashboardLayoutDesignerPageContent />
      </div>
    </DashboardLayoutDesignerProvider>
  );
}
