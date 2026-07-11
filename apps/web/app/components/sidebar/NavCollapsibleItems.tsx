import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ChevronDown } from "lucide-react";

import { cn } from "@repo/theme/utils";
import {
  Popover,
  SidebarLabel,
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

export const NavLinkItem = memo(function NavLinkItem({
  item,
  pathname,
  onNavigate,
  className,
}: {
  readonly item: NavLinkConfig;
  readonly pathname: string;
  readonly onNavigate?: () => void;
  readonly className?: string;
}) {
  const { t } = useTranslation("common");
  const Icon = item.icon;
  const active = isPathActive(pathname, item.matchPath);

  return (
    <SidebarMenuItem className={className}>
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
  headerClassName,
}: {
  readonly subgroup: NavSubGroupConfig;
  readonly pathname: string;
  readonly onNavigate?: () => void;
  readonly headerClassName?: string;
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
          headerClassName,
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
  subgroupHeaderClassName,
}: {
  readonly child: NavGroupChild;
  readonly pathname: string;
  readonly onNavigate?: () => void;
  readonly subgroupHeaderClassName?: string;
}) {
  if (isNavSubGroup(child)) {
    return (
      <NavSubGroupCollapsible
        subgroup={child}
        pathname={pathname}
        onNavigate={onNavigate}
        headerClassName={subgroupHeaderClassName}
      />
    );
  }

  return (
    <NavSubGroupLink link={child} pathname={pathname} onNavigate={onNavigate} />
  );
});

export const NavGroupCollapsible = memo(function NavGroupCollapsible({
  onNavigate,
  group,
  pathname,
  popoverOpen,
  onPopoverOpenChange,
  headerClassName,
  subgroupHeaderClassName,
}: {
  readonly onNavigate?: () => void;
  readonly group: NavGroupConfig;
  readonly pathname: string;
  readonly popoverOpen: boolean;
  readonly onPopoverOpenChange: (open: boolean) => void;
  readonly headerClassName?: string;
  readonly subgroupHeaderClassName?: string;
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
              className={headerClassName}
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
        className={headerClassName}
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
              subgroupHeaderClassName={subgroupHeaderClassName}
            />
          ))}
        </SidebarSubMenu>
      ) : null}
    </SidebarMenuItem>
  );
});
