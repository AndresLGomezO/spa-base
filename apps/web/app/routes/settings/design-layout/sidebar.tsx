import { useTranslation } from "react-i18next";

import { DesignLayoutRouteGuard } from "../../../components/design-layout/DesignLayoutRouteGuard";
import { SidebarLayoutDesignerView } from "../../../features/sidebar-layout-designer/SidebarLayoutDesignerView";

export default function DesignLayoutSidebarRoute() {
  const { t } = useTranslation("common");

  return (
    <DesignLayoutRouteGuard title={t("sidebarLayoutDesigner.title")}>
      <div className="flex min-h-0 flex-1 flex-col">
        <SidebarLayoutDesignerView />
      </div>
    </DesignLayoutRouteGuard>
  );
}
