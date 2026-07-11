import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { cn } from "@repo/theme/utils";
import {
  Logo,
  Sidebar,
  SidebarCollapseButton,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMobile,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@repo/ui";

import { useAuth } from "../../auth/AuthContext";
import { DEFAULT_SITE_NAME } from "../SiteTitleSync";
import { NavMain, NavigationProgressBar } from "./NavMain";
import { SidebarUser } from "./SidebarUser";
import { TenantSwitcher } from "../TenantSwitcher";
import { NotificationBell } from "../../features/notifications/NotificationBell";
import { useTenantSidebarLayoutRuntime } from "../../features/ui-builder/use-tenant-sidebar-layout-runtime";
import { DesignedAppHeader, DesignedAppSidebar } from "./DesignedAppSidebar";

function SidebarBrand({ onNavigate }: { readonly onNavigate?: () => void }) {
  const { activeTenantName, tenantAppearance } = useAuth();
  const logoUrl = tenantAppearance?.logoUrl;
  const title = activeTenantName ?? DEFAULT_SITE_NAME;

  return (
    <Link
      to="/"
      prefetch="intent"
      onClick={onNavigate}
      className={cn(
        "hover:bg-sidebar-highlight hover:text-sidebar-foreground flex w-full min-w-0 items-center gap-2 rounded-md p-2 transition-colors",
        "group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:px-1.5",
      )}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={title}
          className="size-8 shrink-0 rounded object-contain group-data-[collapsible=icon]/sidebar:!size-8"
        />
      ) : (
        <Logo
          size="sm"
          className="shrink-0 group-data-[collapsible=icon]/sidebar:!size-8"
        />
      )}
      <span className="truncate font-semibold group-data-[collapsible=icon]/sidebar:sr-only">
        {title}
      </span>
    </Link>
  );
}

function HardcodedSidebarBody({
  showCollapse = true,
  onNavigate,
}: {
  readonly showCollapse?: boolean;
  readonly onNavigate?: () => void;
}) {
  const { t } = useTranslation("common");
  const { isSuperAdmin, availableTenants } = useAuth();

  return (
    <>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarBrand onNavigate={onNavigate} />
          </SidebarMenuItem>
        </SidebarMenu>
        {showCollapse ? (
          <div className="flex items-center justify-end px-1 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:px-0">
            <SidebarCollapseButton label={t("nav.collapse")} />
          </div>
        ) : null}
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          {isSuperAdmin && availableTenants.length > 0 ? (
            <SidebarMenuItem>
              <TenantSwitcher />
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <NotificationBell />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarUser />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}

function HardcodedAppSidebar() {
  const { t } = useTranslation("common");
  const { setMobileOpen } = useSidebar();

  const closeMobile = () => {
    setMobileOpen(false);
  };

  return (
    <>
      <Sidebar>
        <HardcodedSidebarBody />
      </Sidebar>
      <SidebarMobile title={t("nav.open")}>
        <div
          className="group/sidebar flex h-full flex-col"
          data-collapsible="expanded"
        >
          <HardcodedSidebarBody showCollapse={false} onNavigate={closeMobile} />
        </div>
      </SidebarMobile>
    </>
  );
}

export function AppSidebar() {
  const runtime = useTenantSidebarLayoutRuntime();

  if (runtime.exists) {
    return <DesignedAppSidebar layout={runtime.config.sidebarLayout} />;
  }

  return <HardcodedAppSidebar />;
}

export function AppHeader() {
  const runtime = useTenantSidebarLayoutRuntime();
  const { t } = useTranslation("common");
  const { hamburgerHiddenClassName } = useSidebar();

  if (runtime.exists) {
    return <DesignedAppHeader layout={runtime.config.headerLayout} />;
  }

  return (
    <header
      className={cn(
        "bg-background relative z-20 flex min-h-14 shrink-0 items-center px-4 pt-[env(safe-area-inset-top)]",
        hamburgerHiddenClassName,
      )}
    >
      <NavigationProgressBar />
      <SidebarTrigger label={t("nav.open")} />
    </header>
  );
}
