import { Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthContext";
import { useEntityCatalog } from "../entities/entity-catalog-context";
import { useTenantLabel } from "../i18n/TenantLocalePacksProvider";
import { localizeLayoutDocument } from "../i18n/localize-tenant-catalog";
import { getTenantDashboardLayout } from "../lib/api-client";
import { createTenantDashboardLayoutRenderContext } from "../features/ui-builder/create-tenant-dashboard-layout-render-context";
import { dashboardLayoutHasContent } from "../features/ui-builder/dashboard-layout-has-content";
import { useDashboardViewFilterUrlState } from "../features/ui-builder/use-dashboard-view-filter-url-state";
import { ViewFilterPageProvider } from "../features/ui-builder/view-filter-page-context";
import { ensureContainerRoot } from "@repo/ui-builder-core";
import type { DashboardDateFilterContextValue } from "../lib/metric-binding-resolution";

const TENANT_DASHBOARD_LAYOUT_QUERY_KEY = ["tenant-dashboard-layout"] as const;

export function HomePage() {
  const { t, i18n } = useTranslation("common");
  const { user } = useAuth();
  const { getDefinition, items } = useEntityCatalog();
  const tTenant = useTenantLabel();
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
    const localized = localizeLayoutDocument(
      configQuery.data.dashboardLayout,
      tTenant,
      "dashboard",
    );
    return ensureContainerRoot(
      localized as typeof configQuery.data.dashboardLayout,
    );
  }, [configQuery, tTenant]);

  const localizedSections = useMemo(() => {
    const sections = configQuery.data?.dashboardSections ?? [];
    return sections.map((section) => ({
      ...section,
      ...(typeof section.name === "string"
        ? {
            name: tTenant(`dashboard.section.${section.id}.name`, section.name),
          }
        : {}),
      layout: localizeLayoutDocument(
        section.layout,
        tTenant,
        "dashboard",
      ) as typeof section.layout,
    }));
  }, [configQuery, tTenant]);

  const { collected, pageState } = useDashboardViewFilterUrlState({
    dashboardLayout,
    sections: localizedSections,
    catalog: items,
  });

  const dashboardDateFilter = useMemo(():
    | DashboardDateFilterContextValue
    | undefined => {
    const config = collected.dateFilterConfig;
    if (!config || !pageState.dateFilter.value) {
      return undefined;
    }

    return {
      value: pageState.dateFilter.value,
      granularity: config.granularity,
      param: config.param,
    };
  }, [collected.dateFilterConfig, pageState.dateFilter.value]);

  const renderContext = useMemo(() => {
    if (!configQuery.data) {
      return null;
    }

    return createTenantDashboardLayoutRenderContext({
      sections: localizedSections,
      catalogItems: items,
      locale: i18n.language,
      t,
      getDefinition,
      pageFilters: pageState.filters,
      dashboardDateFilter,
      user: user
        ? {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          }
        : null,
    });
  }, [
    configQuery.data,
    dashboardDateFilter,
    getDefinition,
    i18n.language,
    items,
    localizedSections,
    pageState.filters,
    t,
    user,
  ]);

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
    <ViewFilterPageProvider value={pageState}>
      <RecursiveLayoutRenderer
        layout={dashboardLayout}
        context={renderContext}
      />
    </ViewFilterPageProvider>
  );
}
