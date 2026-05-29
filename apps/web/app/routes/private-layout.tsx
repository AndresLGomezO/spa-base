import { Outlet } from "react-router";

import { SidebarProvider } from "@repo/ui";

import { useAuth } from "../auth/AuthContext";
import { EntityCatalogProvider } from "../entities/entity-catalog-context";
import { RequireAuth, RequireTenant } from "../routing/RouteGuards";
import { AppHeader, AppSidebar } from "../components/sidebar/AppSidebar";

export default function PrivateLayoutRoute() {
  const { tenantId } = useAuth();

  return (
    <RequireAuth>
      <RequireTenant>
        <EntityCatalogProvider>
          <SidebarProvider>
            <div className="flex min-h-dvh">
              <AppSidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <AppHeader />
                <main className="flex-1 p-6">
                  <Outlet key={tenantId ?? "no-tenant"} />
                </main>
              </div>
            </div>
          </SidebarProvider>
        </EntityCatalogProvider>
      </RequireTenant>
    </RequireAuth>
  );
}
