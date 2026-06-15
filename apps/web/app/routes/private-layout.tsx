import { Outlet, useLocation } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { cn } from "@repo/theme/utils";

import { SidebarProvider, ThirdRailHost, ThirdRailProvider } from "@repo/ui";

import { EntityCatalogProvider } from "../entities/entity-catalog-context";
import { queryClient } from "../query/query-client";
import { useLockDocumentScroll } from "../routing/use-lock-document-scroll";
import { RequireAuth } from "../routing/RouteGuards";
import { TenantBrandingProvider } from "../theme/TenantBrandingProvider";
import { AppHeader, AppSidebar } from "../components/sidebar/AppSidebar";
import { CreateTenantModalProvider } from "../components/platform/create-tenant-modal-context";
import { CreateTenantModal } from "../components/platform/CreateTenantModal";

function MainOutlet() {
  const location = useLocation();
  const isHomeDashboard = location.pathname === "/";

  return (
    <main
      className={cn(
        "mx-0 flex min-h-0 min-w-0 w-full max-w-none flex-1 flex-col overflow-hidden",
        !isHomeDashboard && "p-4",
      )}
    >
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          isHomeDashboard ? "w-full overflow-y-auto" : "overflow-hidden",
        )}
      >
        <Outlet />
      </div>
    </main>
  );
}

export default function PrivateLayoutRoute() {
  useLockDocumentScroll();

  return (
    <RequireAuth>
      <QueryClientProvider client={queryClient}>
        <EntityCatalogProvider>
          <CreateTenantModalProvider>
            <ThirdRailProvider>
              <TenantBrandingProvider>
                <SidebarProvider>
                  <div className="relative flex h-dvh overflow-hidden">
                    <AppSidebar />
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                      <AppHeader />
                      <MainOutlet />
                    </div>
                    <ThirdRailHost />
                  </div>
                </SidebarProvider>
                <CreateTenantModal />
              </TenantBrandingProvider>
            </ThirdRailProvider>
          </CreateTenantModalProvider>
        </EntityCatalogProvider>
      </QueryClientProvider>
    </RequireAuth>
  );
}
