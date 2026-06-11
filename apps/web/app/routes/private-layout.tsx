import { Outlet } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { SidebarProvider, ThirdRailHost, ThirdRailProvider } from "@repo/ui";

import { EntityCatalogProvider } from "../entities/entity-catalog-context";
import { queryClient } from "../query/query-client";
import { useLockDocumentScroll } from "../routing/use-lock-document-scroll";
import { RequireAuth } from "../routing/RouteGuards";
import { TenantBrandingProvider } from "../theme/TenantBrandingProvider";
import { AppHeader, AppSidebar } from "../components/sidebar/AppSidebar";
import { CreateTenantModalProvider } from "../components/platform/create-tenant-modal-context";
import { CreateTenantModal } from "../components/platform/CreateTenantModal";

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
                      <main className="mx-0 flex min-h-0 min-w-0 w-full max-w-none flex-1 flex-col overflow-hidden p-6">
                        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
                          <Outlet />
                        </div>
                      </main>
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
