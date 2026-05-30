import { Outlet } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { SidebarProvider } from "@repo/ui";

import { EntityCatalogProvider } from "../entities/entity-catalog-context";
import { queryClient } from "../query/query-client";
import { RequireAuth } from "../routing/RouteGuards";
import { TenantBrandingProvider } from "../theme/TenantBrandingProvider";
import { AppHeader, AppSidebar } from "../components/sidebar/AppSidebar";

export default function PrivateLayoutRoute() {
  return (
    <RequireAuth>
      <QueryClientProvider client={queryClient}>
        <EntityCatalogProvider>
          <TenantBrandingProvider>
            <SidebarProvider>
              <div className="flex h-dvh overflow-hidden">
                <AppSidebar />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <AppHeader />
                  <main className="mx-0 min-h-0 min-w-0 w-full max-w-none flex-1 overflow-x-hidden overflow-y-auto p-6">
                    <Outlet />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </TenantBrandingProvider>
        </EntityCatalogProvider>
      </QueryClientProvider>
    </RequireAuth>
  );
}
