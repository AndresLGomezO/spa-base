import { useLocation } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { cn } from "@repo/theme/utils";

import { ThirdRailHost, ThirdRailProvider } from "@repo/ui";

import { EntityCatalogProvider } from "../entities/entity-catalog-context";
import { CustomViewCatalogProvider } from "../custom-views/custom-view-catalog-context";
import { EntityFormModalProvider } from "../components/entity/entity-form-modal-context";
import { EntityFormModalHost } from "../components/entity/EntityFormModalHost";
import { queryClient } from "../query/query-client";
import { useLockDocumentScroll } from "../routing/use-lock-document-scroll";
import { NavItemsProvider } from "../routing/nav-items-context";
import { NavigationPendingOutlet } from "../routing/NavigationPendingOutlet";
import { PageTitleProvider } from "../routing/page-title-context";
import { RequireAuth } from "../routing/RouteGuards";
import { AppHeader, AppSidebar } from "../components/sidebar/AppSidebar";
import { AppFooter } from "../components/sidebar/AppFooter";
import { TenantAwareSidebarProvider } from "../components/sidebar/TenantAwareSidebarProvider";
import { useTenantSidebarLayoutRuntime } from "../features/ui-builder/use-tenant-sidebar-layout-runtime";
import { CreateTenantModalProvider } from "../components/platform/create-tenant-modal-context";
import { CreateTenantModal } from "../components/platform/CreateTenantModal";
import { IndexProvisioningGlobalBanner } from "../components/index-provisioning/IndexProvisioningGlobalBanner";
import { NotificationsProvider } from "../features/notifications/notifications-context";
import { EntitySaveManagerProvider } from "../features/entity-save/entity-save-context";

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
        <NavigationPendingOutlet />
      </div>
    </main>
  );
}

function AppShellColumn() {
  const runtime = useTenantSidebarLayoutRuntime();
  const footerLayout = runtime.exists ? runtime.config.footerLayout : null;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <AppHeader />
      <MainOutlet />
      {footerLayout ? <AppFooter layout={footerLayout} /> : null}
    </div>
  );
}

export default function PrivateLayoutRoute() {
  useLockDocumentScroll();

  return (
    <RequireAuth>
      <QueryClientProvider client={queryClient}>
        <EntityCatalogProvider>
          <CustomViewCatalogProvider>
            <NavItemsProvider>
              <PageTitleProvider>
                <EntityFormModalProvider>
                  <NotificationsProvider>
                    <EntitySaveManagerProvider>
                      <CreateTenantModalProvider>
                        <ThirdRailProvider>
                          <TenantAwareSidebarProvider>
                            <div className="bg-background relative flex h-dvh max-h-dvh min-h-dvh overflow-hidden">
                              <AppSidebar />
                              <AppShellColumn />
                              <ThirdRailHost />
                            </div>
                          </TenantAwareSidebarProvider>
                          <CreateTenantModal />
                          <IndexProvisioningGlobalBanner />
                        </ThirdRailProvider>
                      </CreateTenantModalProvider>
                      <EntityFormModalHost />
                    </EntitySaveManagerProvider>
                  </NotificationsProvider>
                </EntityFormModalProvider>
              </PageTitleProvider>
            </NavItemsProvider>
          </CustomViewCatalogProvider>
        </EntityCatalogProvider>
      </QueryClientProvider>
    </RequireAuth>
  );
}
