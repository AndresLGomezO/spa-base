import { RESPONSIVE_BREAKPOINT_PREVIEW_WIDTHS } from "@repo/ui-builder-core";
import type { ResponsiveGridBreakpoint } from "@repo/ui-builder-core";
import type { TenantSidebarLayoutSettings } from "@repo/entities";
import { useQuery } from "@tanstack/react-query";

import {
  getTenantSidebarLayout,
  type TenantSidebarLayoutGetResponse,
} from "../../lib/api-client";
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
  const query = useQuery({
    queryKey: TENANT_SIDEBAR_LAYOUT_QUERY_KEY,
    queryFn: async () => getTenantSidebarLayout(),
    staleTime: 30_000,
  });

  if (query.isLoading) {
    return { exists: false, isLoading: true };
  }

  if (query.data?.exists) {
    return {
      exists: true,
      isLoading: false,
      config: query.data.config,
    };
  }

  return { exists: false, isLoading: false };
}
