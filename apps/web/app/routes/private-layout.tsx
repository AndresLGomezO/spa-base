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
              <div className="flex min-h-dvh">
                <AppSidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                  <AppHeader />
                  <main className="flex-1 p-6">
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
