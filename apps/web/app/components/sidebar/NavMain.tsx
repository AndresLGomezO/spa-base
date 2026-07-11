import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigation } from "react-router";

import { cn } from "@repo/theme/utils";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@repo/ui";

import {
  findFirstSystemConfigNavIndex,
  isNavGroup,
  shouldShowSystemConfigurationNavSection,
} from "./nav-config";
import { NavGroupCollapsible, NavLinkItem } from "./NavCollapsibleItems";
import { useNavItems } from "../../routing/nav-items-context";

function NavSystemConfigurationSectionHeader() {
  const { t } = useTranslation("common");

  return (
    <SidebarMenuItem
      role="presentation"
      aria-label={t("nav.systemConfiguration")}
      className={cn(
        "pointer-events-none mt-4 gap-3 pt-1 pb-2",
        "group-data-[collapsible=icon]/sidebar:mt-3 group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:py-1 group-data-[collapsible=icon]/sidebar:pb-0",
      )}
    >
      <SidebarSeparator className="mx-0" />
      <span className="text-muted-foreground px-2 pt-0.5 text-[11px] font-semibold uppercase tracking-wide group-data-[collapsible=icon]/sidebar:sr-only">
        {t("nav.systemConfiguration")}
      </span>
    </SidebarMenuItem>
  );
}

export function NavMain() {
  const { pathname } = useLocation();
  const { setMobileOpen } = useSidebar();
  const { navItems } = useNavItems();
  const systemConfigStartIndex = findFirstSystemConfigNavIndex(navItems);
  const showSystemConfigurationSection =
    shouldShowSystemConfigurationNavSection(navItems);
  const [openGroupPopoverId, setOpenGroupPopoverId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setOpenGroupPopoverId(null);
  }, [pathname]);

  const closeMobile = () => {
    setMobileOpen(false);
    setOpenGroupPopoverId(null);
  };

  return (
    <SidebarGroup>
      <SidebarMenu>
        {navItems.map((item, index) => (
          <Fragment key={item.id}>
            {showSystemConfigurationSection &&
            index === systemConfigStartIndex ? (
              <NavSystemConfigurationSectionHeader />
            ) : null}
            {isNavGroup(item) ? (
              <NavGroupCollapsible
                group={item}
                pathname={pathname}
                onNavigate={closeMobile}
                popoverOpen={openGroupPopoverId === item.id}
                onPopoverOpenChange={(open) =>
                  setOpenGroupPopoverId(open ? item.id : null)
                }
              />
            ) : (
              <NavLinkItem
                item={item}
                pathname={pathname}
                onNavigate={closeMobile}
              />
            )}
          </Fragment>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export function NavigationProgressBar() {
  const navigation = useNavigation();
  const isNavigating = navigation.state === "loading";

  if (!isNavigating) {
    return null;
  }

  return (
    <div
      className="bg-primary absolute inset-x-0 top-0 h-0.5 animate-pulse"
      aria-hidden
    />
  );
}
