import { Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthContext";
import { getTenantDashboardLayout } from "../lib/api-client";
import { createTenantDashboardLayoutRenderContext } from "../features/ui-builder/create-tenant-dashboard-layout-render-context";
import { dashboardLayoutHasContent } from "../features/ui-builder/dashboard-layout-has-content";
import { ensureContainerRoot } from "@repo/ui-builder-core";

const TENANT_DASHBOARD_LAYOUT_QUERY_KEY = ["tenant-dashboard-layout"] as const;

export function HomePage() {
  const { t, i18n } = useTranslation("common");
  const { user } = useAuth();
  const configQuery = useQuery({
    queryKey: TENANT_DASHBOARD_LAYOUT_QUERY_KEY,
    queryFn: async () => {
      const result = await getTenantDashboardLayout();
      return result.config;
    },
  });

  const dashboardLayout = useMemo(() => {
    if (!configQuery.data?.dashboardLayout) {
      return null;
    }
    return ensureContainerRoot(configQuery.data.dashboardLayout);
  }, [configQuery.data?.dashboardLayout]);

  const renderContext = useMemo(() => {
    if (!configQuery.data) {
      return null;
    }

    return createTenantDashboardLayoutRenderContext({
      sections: configQuery.data.dashboardSections,
      locale: i18n.language,
      t,
      user: user
        ? {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          }
        : null,
    });
  }, [configQuery.data, i18n.language, t, user]);

  if (configQuery.isLoading) {
    return (
      <div className="p-4">
        <Text className="text-muted-foreground text-sm">
          {t("home.dashboardLoading")}
        </Text>
      </div>
    );
  }

  if (configQuery.isError) {
    return (
      <div className="p-4">
        <Text className="text-destructive text-sm">
          {t("home.dashboardLoadFailed")}
        </Text>
      </div>
    );
  }

  if (
    !dashboardLayout ||
    !renderContext ||
    !dashboardLayoutHasContent(dashboardLayout)
  ) {
    return (
      <div className="p-4">
        <Text className="text-muted-foreground text-sm">
          {t("home.dashboardEmpty")}
        </Text>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <RecursiveLayoutRenderer
        layout={dashboardLayout}
        context={renderContext}
        className="min-h-0 flex-1"
        stretchRootColumns
      />
    </div>
  );
}
