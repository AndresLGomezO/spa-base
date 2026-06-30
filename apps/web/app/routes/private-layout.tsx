import { Outlet, useLocation } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { cn } from "@repo/theme/utils";

import { SidebarProvider, ThirdRailHost, ThirdRailProvider } from "@repo/ui";

import { EntityCatalogProvider } from "../entities/entity-catalog-context";
import { EntityFormModalProvider } from "../components/entity/entity-form-modal-context";
import { EntityFormModalHost } from "../components/entity/EntityFormModalHost";
import { queryClient } from "../query/query-client";
import { useLockDocumentScroll } from "../routing/use-lock-document-scroll";
import { RequireAuth } from "../routing/RouteGuards";
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
        !isHomeDashboard && "p-macro",
      )}
    >
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto overflow-x-hidden">
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
          <EntityFormModalProvider>
            <CreateTenantModalProvider>
              <ThirdRailProvider>
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
              </ThirdRailProvider>
            </CreateTenantModalProvider>
            <EntityFormModalHost />
          </EntityFormModalProvider>
        </EntityCatalogProvider>
      </QueryClientProvider>
    </RequireAuth>
  );
}
