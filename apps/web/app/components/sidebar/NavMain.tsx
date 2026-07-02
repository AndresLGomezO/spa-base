import { memo, useEffect, useState, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigation } from "react-router";
import { ChevronDown } from "lucide-react";

import { cn } from "@repo/theme/utils";
import {
  Popover,
  SidebarGroup,
  SidebarLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuIcon,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarSubMenu,
  sidebarMenuButtonClassName,
  useSidebar,
} from "@repo/ui";

import {
  isNavGroup,
  isNavGroupActive,
  isNavSubGroup,
  isNavSubGroupActive,
  isPathActive,
  resolveNavGroupLabel,
  resolveNavLinkLabel,
  resolveNavSubGroupLabel,
  shouldShowSystemConfigurationNavSection,
  findFirstSystemConfigNavIndex,
  type NavGroupConfig,
  type NavGroupChild,
  type NavLinkConfig,
  type NavSubGroupConfig,
} from "./nav-config";
import { useNavItems } from "../../routing/nav-items-context";

const NavLinkItem = memo(function NavLinkItem({
  item,
  pathname,
  onNavigate,
}: {
  readonly item: NavLinkConfig;
  readonly pathname: string;
  readonly onNavigate?: () => void;
}) {
  const { t } = useTranslation("common");
  const Icon = item.icon;
  const active = isPathActive(pathname, item.matchPath);

  return (
    <SidebarMenuItem>
      <Link
        to={item.to}
        prefetch="intent"
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          sidebarMenuButtonClassName({ isActive: active }),
          "w-full",
        )}
      >
        <SidebarMenuIcon>
          <Icon />
        </SidebarMenuIcon>
        <SidebarLabel>{resolveNavLinkLabel(item, t)}</SidebarLabel>
      </Link>
    </SidebarMenuItem>
  );
});

const NavSubGroupLink = memo(function NavSubGroupLink({
  link,
  pathname,
  onNavigate,
}: {
  readonly link: NavLinkConfig;
  readonly pathname: string;
  readonly onNavigate?: () => void;
}) {
  const { t } = useTranslation("common");
  const ChildIcon = link.icon;
  const active = isPathActive(pathname, link.matchPath);

  return (
    <li className="list-none min-w-0 w-full">
      <Link
        to={link.to}
        prefetch="intent"
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          sidebarMenuButtonClassName({ isActive: active }),
          "min-w-0",
        )}
      >
        <SidebarMenuIcon>
          <ChildIcon />
        </SidebarMenuIcon>
        <SidebarLabel>{resolveNavLinkLabel(link, t)}</SidebarLabel>
      </Link>
    </li>
  );
});

const NavLinkPopoverItem = memo(function NavLinkPopoverItem({
  link,
  pathname,
  onNavigate,
  onClosePopover,
}: {
  readonly link: NavLinkConfig;
  readonly pathname: string;
  readonly onNavigate?: () => void;
  readonly onClosePopover: () => void;
}) {
  const { t } = useTranslation("common");
  const ChildIcon = link.icon;
  const active = isPathActive(pathname, link.matchPath);

  return (
    <Link
      to={link.to}
      prefetch="intent"
      onClick={() => {
        onNavigate?.();
        onClosePopover();
      }}
      aria-current={active ? "page" : undefined}
      className={sidebarMenuButtonClassName({ isActive: active })}
    >
      <SidebarMenuIcon>
        <ChildIcon />
      </SidebarMenuIcon>
      <SidebarLabel>{resolveNavLinkLabel(link, t)}</SidebarLabel>
    </Link>
  );
});

const NavSubGroupCollapsible = memo(function NavSubGroupCollapsible({
  subgroup,
  pathname,
  onNavigate,
}: {
  readonly subgroup: NavSubGroupConfig;
  readonly pathname: string;
  readonly onNavigate?: () => void;
}) {
  const { t } = useTranslation("common");
  const subgroupActive = isNavSubGroupActive(pathname, subgroup);
  const [open, setOpen] = useState(subgroupActive);

  useEffect(() => {
    if (subgroupActive) {
      setOpen(true);
    }
  }, [subgroupActive]);

  return (
    <li className="list-none min-w-0 w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          sidebarMenuButtonClassName({ isActive: subgroupActive }),
          "text-muted-foreground w-full text-sm",
        )}
      >
        <SidebarLabel>{resolveNavSubGroupLabel(subgroup, t)}</SidebarLabel>
        <ChevronDown
          className={`ml-auto size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <SidebarSubMenu className="border-l-0 pl-2">
          {subgroup.children.map((link) => (
            <NavSubGroupLink
              key={link.id}
              link={link}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </SidebarSubMenu>
      ) : null}
    </li>
  );
});

const NavGroupChildLinks = memo(function NavGroupChildLinks({
  child,
  pathname,
  onNavigate,
}: {
  readonly child: NavGroupChild;
  readonly pathname: string;
  readonly onNavigate?: () => void;
}) {
  if (isNavSubGroup(child)) {
    return (
      <NavSubGroupCollapsible
        subgroup={child}
        pathname={pathname}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <NavSubGroupLink link={child} pathname={pathname} onNavigate={onNavigate} />
  );
});

const SettingsGroup = memo(function SettingsGroup({
  onNavigate,
  group,
  pathname,
  popoverOpen,
  onPopoverOpenChange,
}: {
  readonly onNavigate?: () => void;
  readonly group: NavGroupConfig;
  readonly pathname: string;
  readonly popoverOpen: boolean;
  readonly onPopoverOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("common");
  const { collapsed, isMobile } = useSidebar();
  const usePopoverNav = collapsed && !isMobile;
  const groupActive = isNavGroupActive(pathname, group);
  const [open, setOpen] = useState(groupActive);

  useEffect(() => {
    if (groupActive) {
      setOpen(true);
    }
  }, [groupActive]);

  if (!isNavGroup(group)) {
    return null;
  }

  const Icon = group.icon;

  if (usePopoverNav) {
    return (
      <SidebarMenuItem>
        <Popover
          open={popoverOpen}
          onOpenChange={onPopoverOpenChange}
          placement="right-start"
          className="block w-full"
          trigger={
            <SidebarMenuButton
              isActive={groupActive}
              tooltip={resolveNavGroupLabel(group, t)}
            >
              <SidebarMenuIcon>
                <Icon />
              </SidebarMenuIcon>
            </SidebarMenuButton>
          }
        >
          {group.children.map((child) =>
            isNavSubGroup(child) ? (
              <div key={child.id} className="flex flex-col gap-0.5">
                <span className="text-muted-foreground px-2 py-1 text-[11px] font-semibold uppercase tracking-wide">
                  {resolveNavSubGroupLabel(child, t)}
                </span>
                {child.children.map((link) => (
                  <NavLinkPopoverItem
                    key={link.id}
                    link={link}
                    pathname={pathname}
                    onNavigate={onNavigate}
                    onClosePopover={() => onPopoverOpenChange(false)}
                  />
                ))}
              </div>
            ) : (
              <NavLinkPopoverItem
                key={child.id}
                link={child}
                pathname={pathname}
                onNavigate={onNavigate}
                onClosePopover={() => onPopoverOpenChange(false)}
              />
            ),
          )}
        </Popover>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={groupActive}
        aria-expanded={open}
        onClick={() => setOpen((current: boolean) => !current)}
      >
        <SidebarMenuIcon>
          <Icon />
        </SidebarMenuIcon>
        <SidebarLabel>{resolveNavGroupLabel(group, t)}</SidebarLabel>
        <ChevronDown
          className={`ml-auto size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </SidebarMenuButton>
      {open ? (
        <SidebarSubMenu>
          {group.children.map((child) => (
            <NavGroupChildLinks
              key={child.id}
              child={child}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </SidebarSubMenu>
      ) : null}
    </SidebarMenuItem>
  );
});

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
              <SettingsGroup
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
