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
} from "@repo/ui";

import { useAuth } from "../../auth/AuthContext";
import { DEFAULT_SITE_NAME } from "../SiteTitleSync";
import { NavMain } from "./NavMain";
import { SidebarUser } from "./SidebarUser";
import { TenantSwitcher } from "../TenantSwitcher";

function SidebarBrand() {
  const { activeTenantName, tenantAppearance } = useAuth();
  const logoUrl = tenantAppearance?.logoUrl;
  const title = activeTenantName ?? DEFAULT_SITE_NAME;

  return (
    <Link
      to="/"
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

function SidebarBody({
  showCollapse = true,
}: {
  readonly showCollapse?: boolean;
}) {
  const { t } = useTranslation("common");
  const { isSuperAdmin } = useAuth();

  return (
    <>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarBrand />
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
          {isSuperAdmin ? (
            <SidebarMenuItem>
              <TenantSwitcher />
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <SidebarUser />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}

export function AppSidebar() {
  const { t } = useTranslation("common");

  return (
    <>
      <Sidebar>
        <SidebarBody />
      </Sidebar>
      <SidebarMobile title={t("nav.open")}>
        <div
          className="group/sidebar flex h-full flex-col"
          data-collapsible="expanded"
        >
          <SidebarBody showCollapse={false} />
        </div>
      </SidebarMobile>
    </>
  );
}

export function AppHeader() {
  const { t } = useTranslation("common");

  return (
    <header className="border-border flex h-14 shrink-0 items-center border-b px-4 md:hidden">
      <SidebarTrigger label={t("nav.open")} />
    </header>
  );
}
