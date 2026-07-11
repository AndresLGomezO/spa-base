import type { ReactNode } from "react";
import { SidebarProvider } from "@repo/ui";

import {
  resolveSidebarAutoCollapseBreakpointPx,
  resolveSidebarHamburgerBreakpointPx,
  useTenantSidebarLayoutRuntime,
} from "../../features/ui-builder/use-tenant-sidebar-layout-runtime";

interface TenantAwareSidebarProviderProps {
  readonly children: ReactNode;
}

/**
 * Wraps SidebarProvider with tenant sidebar layout breakpoint settings when an override exists.
 */
export function TenantAwareSidebarProvider({
  children,
}: TenantAwareSidebarProviderProps) {
  const runtime = useTenantSidebarLayoutRuntime();
  const settings = runtime.exists ? runtime.config.settings : undefined;

  return (
    <SidebarProvider
      hamburgerBreakpointPx={resolveSidebarHamburgerBreakpointPx(settings)}
      autoCollapseBreakpointPx={resolveSidebarAutoCollapseBreakpointPx(
        settings,
      )}
    >
      {children}
    </SidebarProvider>
  );
}
