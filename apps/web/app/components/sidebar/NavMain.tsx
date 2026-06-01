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
  isPathActive,
  resolveNavGroupLabel,
  resolveNavLinkLabel,
  type NavGroupConfig,
  type NavLinkConfig,
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

function SettingsGroup({
  onNavigate,
  group,
}: {
  readonly onNavigate?: () => void;
  readonly group: NavGroupConfig;
}) {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const { collapsed } = useSidebar();
  const groupActive = isPathActive(pathname, group.matchPath);
  const [open, setOpen] = useState(groupActive);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    if (groupActive) {
      setOpen(true);
    }
  }, [groupActive]);

  if (!isNavGroup(group)) {
    return null;
  }

  const Icon = group.icon;

  if (collapsed) {
    return (
      <SidebarMenuItem>
        <Popover
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
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
          {group.children.map((child) => {
            const ChildIcon = child.icon;
            const active = isPathActive(pathname, child.matchPath);

            return (
              <NavLink
                key={child.id}
                to={child.to}
                onClick={() => {
                  onNavigate?.();
                  setPopoverOpen(false);
                }}
                className={sidebarMenuButtonClassName({ isActive: active })}
              >
                <SidebarMenuIcon>
                  <ChildIcon />
                </SidebarMenuIcon>
                <SidebarLabel>{resolveNavLinkLabel(child, t)}</SidebarLabel>
              </NavLink>
            );
          })}
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
          {group.children.map((child) => {
            const ChildIcon = child.icon;

            return (
              <li key={child.id} className="list-none min-w-0 w-full">
                <NavLink
                  to={child.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(sidebarMenuButtonClassName({ isActive }), "min-w-0")
                  }
                >
                  <SidebarMenuIcon>
                    <ChildIcon />
                  </SidebarMenuIcon>
                  <SidebarLabel>{resolveNavLinkLabel(child, t)}</SidebarLabel>
                </NavLink>
              </li>
            );
          })}
        </SidebarSubMenu>
      ) : null}
    </SidebarMenuItem>
  );
}

export function NavMain() {
  const { setMobileOpen } = useSidebar();
  const navItems = useAccessibleNavItems();

  const closeMobile = () => {
    setMobileOpen(false);
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
            />
          ) : (
            <NavLinkItem key={item.id} item={item} onNavigate={closeMobile} />
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
