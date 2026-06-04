import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router";
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
  type NavGroupConfig,
  type NavGroupChild,
  type NavLinkConfig,
  type NavSubGroupConfig,
} from "./nav-config";
import { useAccessibleNavItems } from "../../routing/useAccessibleNavItems";

function NavLinkItem({
  item,
  onNavigate,
}: {
  readonly item: NavLinkConfig;
  readonly onNavigate?: () => void;
}) {
  const { t } = useTranslation("common");
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <NavLink
        to={item.to}
        end={item.matchPath === "/"}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(sidebarMenuButtonClassName({ isActive }), "w-full")
        }
      >
        <SidebarMenuIcon>
          <Icon />
        </SidebarMenuIcon>
        <SidebarLabel>{resolveNavLinkLabel(item, t)}</SidebarLabel>
      </NavLink>
    </SidebarMenuItem>
  );
}

function NavSubGroupLink({
  link,
  onNavigate,
}: {
  readonly link: NavLinkConfig;
  readonly onNavigate?: () => void;
}) {
  const { t } = useTranslation("common");
  const ChildIcon = link.icon;

  return (
    <li className="list-none min-w-0 w-full">
      <NavLink
        to={link.to}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(sidebarMenuButtonClassName({ isActive }), "min-w-0")
        }
      >
        <SidebarMenuIcon>
          <ChildIcon />
        </SidebarMenuIcon>
        <SidebarLabel>{resolveNavLinkLabel(link, t)}</SidebarLabel>
      </NavLink>
    </li>
  );
}

function NavLinkPopoverItem({
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
    <NavLink
      to={link.to}
      onClick={() => {
        onNavigate?.();
        onClosePopover();
      }}
      className={sidebarMenuButtonClassName({ isActive: active })}
    >
      <SidebarMenuIcon>
        <ChildIcon />
      </SidebarMenuIcon>
      <SidebarLabel>{resolveNavLinkLabel(link, t)}</SidebarLabel>
    </NavLink>
  );
}

function NavSubGroupCollapsible({
  subgroup,
  onNavigate,
}: {
  readonly subgroup: NavSubGroupConfig;
  readonly onNavigate?: () => void;
}) {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
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
              onNavigate={onNavigate}
            />
          ))}
        </SidebarSubMenu>
      ) : null}
    </li>
  );
}

function NavGroupChildLinks({
  child,
  onNavigate,
}: {
  readonly child: NavGroupChild;
  readonly onNavigate?: () => void;
}) {
  if (isNavSubGroup(child)) {
    return <NavSubGroupCollapsible subgroup={child} onNavigate={onNavigate} />;
  }

  return <NavSubGroupLink link={child} onNavigate={onNavigate} />;
}

function SettingsGroup({
  onNavigate,
  group,
  popoverOpen,
  onPopoverOpenChange,
}: {
  readonly onNavigate?: () => void;
  readonly group: NavGroupConfig;
  readonly popoverOpen: boolean;
  readonly onPopoverOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
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
              onNavigate={onNavigate}
            />
          ))}
        </SidebarSubMenu>
      ) : null}
    </SidebarMenuItem>
  );
}

export function NavMain() {
  const { pathname } = useLocation();
  const { setMobileOpen } = useSidebar();
  const navItems = useAccessibleNavItems();
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
        {navItems.map((item) =>
          isNavGroup(item) ? (
            <SettingsGroup
              key={item.id}
              group={item}
              onNavigate={closeMobile}
              popoverOpen={openGroupPopoverId === item.id}
              onPopoverOpenChange={(open) =>
                setOpenGroupPopoverId(open ? item.id : null)
              }
            />
          ) : (
            <NavLinkItem key={item.id} item={item} onNavigate={closeMobile} />
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
