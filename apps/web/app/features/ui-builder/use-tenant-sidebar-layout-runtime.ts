import { RESPONSIVE_BREAKPOINT_PREVIEW_WIDTHS } from "@repo/ui-builder-core";
import type { ResponsiveGridBreakpoint } from "@repo/ui-builder-core";
import type { TenantSidebarLayoutSettings } from "@repo/entities";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  getTenantSidebarLayout,
  type TenantSidebarLayoutGetResponse,
} from "../../lib/api-client";
import { useTenantLabel } from "../../i18n/TenantLocalePacksProvider";
import { localizeLayoutDocument } from "../../i18n/localize-tenant-catalog";
import { TENANT_SIDEBAR_LAYOUT_QUERY_KEY } from "../ui-builder/use-tenant-sidebar-layout-editor";

function sidebarBreakpointToPx(breakpoint: ResponsiveGridBreakpoint): number {
  return RESPONSIVE_BREAKPOINT_PREVIEW_WIDTHS[breakpoint];
}

export function resolveSidebarHamburgerBreakpointPx(
  settings: TenantSidebarLayoutSettings | undefined,
): number {
  return sidebarBreakpointToPx(settings?.hamburgerBreakpoint ?? "md");
}

export function resolveSidebarAutoCollapseBreakpointPx(
  settings: TenantSidebarLayoutSettings | undefined,
): number | null {
  const value = settings?.autoCollapseBreakpoint;
  if (value == null) {
    return null;
  }
  return sidebarBreakpointToPx(value);
}

type TenantSidebarLayoutRuntime =
  | { readonly exists: false; readonly isLoading: boolean }
  | {
      readonly exists: true;
      readonly isLoading: boolean;
      readonly config: Extract<
        TenantSidebarLayoutGetResponse,
        { exists: true }
      >["config"];
    };

export function useTenantSidebarLayoutRuntime(): TenantSidebarLayoutRuntime {
  const tTenant = useTenantLabel();
  const query = useQuery({
    queryKey: TENANT_SIDEBAR_LAYOUT_QUERY_KEY,
    queryFn: async () => getTenantSidebarLayout(),
    staleTime: 30_000,
  });

  const localizedConfig = useMemo(() => {
    if (!query.data?.exists) return null;
    const config = query.data.config;
    return {
      ...config,
      sidebarLayout: localizeLayoutDocument(
        config.sidebarLayout,
        tTenant,
        "sidebar",
      ) as typeof config.sidebarLayout,
      headerLayout: localizeLayoutDocument(
        config.headerLayout,
        tTenant,
        "sidebar",
      ) as typeof config.headerLayout,
      ...(config.footerLayout
        ? {
            footerLayout: localizeLayoutDocument(
              config.footerLayout,
              tTenant,
              "sidebar",
            ) as typeof config.footerLayout,
          }
        : {}),
    };
  }, [query.data, tTenant]);

  if (query.isLoading) {
    return { exists: false, isLoading: true };
  }

  if (localizedConfig) {
    return {
      exists: true,
      isLoading: false,
      config: localizedConfig,
    };
  }

  return { exists: false, isLoading: false };
}
