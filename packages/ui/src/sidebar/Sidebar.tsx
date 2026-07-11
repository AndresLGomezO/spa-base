import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@repo/theme/utils";

import { Sheet } from "../sheet/Sheet";
import {
  sidebarMenuButtonClassName,
  type SidebarMenuButtonSize,
} from "./sidebar.variants";
import { useSidebar } from "./SidebarContext";

interface SidebarProps extends HTMLAttributes<HTMLElement> {
  readonly children: ReactNode;
}

export function Sidebar({ children, className, ...props }: SidebarProps) {
  const { collapsed, isMobile } = useSidebar();

  if (isMobile) {
    return null;
  }

  return (
    <aside
      data-collapsible={collapsed ? "icon" : "expanded"}
      className={cn(
        "group/sidebar bg-sidebar text-sidebar-foreground border-sidebar-border relative flex h-full shrink-0 flex-col overflow-hidden overscroll-y-contain border-r pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] transition-[width] duration-200 ease-linear",
        collapsed ? "w-(--sidebar-width-icon)" : "w-(--sidebar-width)",
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-2 group-data-[collapsible=icon]/sidebar:gap-1 group-data-[collapsible=icon]/sidebar:px-1 group-data-[collapsible=icon]/sidebar:py-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarSeparator({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        "bg-sidebar-border mx-2 h-px shrink-0",
        "group-data-[collapsible=icon]/sidebar:mx-1",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarContent({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarFooter({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-auto overflow-visible p-2 group-data-[collapsible=icon]/sidebar:px-1 group-data-[collapsible=icon]/sidebar:py-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarRail({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      aria-label="Toggle sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      className={cn(
        "absolute inset-y-0 -right-1.5 z-20 hidden w-3 cursor-col-resize sm:block",
        "before:bg-sidebar-border before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:transition-colors",
        "hover:before:bg-text-tertiary",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroup({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex w-full flex-col gap-1", className)} {...props}>
      {children}
    </div>
  );
}

export function SidebarMenu({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    >
      {children}
    </ul>
  );
}

export function SidebarMenuItem({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      className={cn(
        "list-none flex w-full min-w-0 flex-col [&>*]:w-full [&>*]:min-w-0",
        className,
      )}
      {...props}
    >
      {children}
    </li>
  );
}

export interface SidebarMenuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly isActive?: boolean;
  readonly size?: SidebarMenuButtonSize;
  readonly tooltip?: string;
}

export function SidebarMenuButton({
  isActive = false,
  size = "default",
  tooltip,
  className,
  children,
  ...props
}: SidebarMenuButtonProps) {
  const { collapsed } = useSidebar();

  return (
    <button
      type="button"
      data-active={isActive}
      title={collapsed ? tooltip : undefined}
      className={sidebarMenuButtonClassName({ isActive, size, className })}
      {...props}
    >
      {children}
    </button>
  );
}

interface SidebarCollapseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly label: string;
}

export function SidebarCollapseButton({
  label,
  className,
  ...props
}: SidebarCollapseButtonProps) {
  const { toggleSidebar, collapsed } = useSidebar();

  return (
    <button
      type="button"
      aria-label={label}
      onClick={toggleSidebar}
      className={cn(
        "text-sidebar-foreground hover:bg-sidebar-highlight hover:text-sidebar-foreground hidden size-8 shrink-0 items-center justify-center rounded-md transition-colors sm:flex",
        className,
      )}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={cn(
          "size-4 transition-transform",
          collapsed ? "rotate-180" : "",
        )}
        aria-hidden
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}

interface SidebarTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly label: string;
}

export function SidebarTrigger({
  label,
  className,
  ...props
}: SidebarTriggerProps) {
  const { setMobileOpen } = useSidebar();

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => setMobileOpen(true)}
      className={cn(
        "text-foreground hover:bg-hover inline-flex size-9 items-center justify-center rounded-md border border-border transition-colors md:hidden",
        className,
      )}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="size-5"
        aria-hidden
      >
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

export function SidebarLabel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "min-w-0 flex-1 truncate group-data-[collapsible=icon]/sidebar:sr-only",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function SidebarMenuIcon({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center [&>svg]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function SidebarSubMenu({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn(
        "border-sidebar-border box-border flex w-full min-w-0 flex-col gap-1 overflow-hidden border-l pl-3 group-data-[collapsible=icon]/sidebar:hidden",
        className,
      )}
      {...props}
    >
      {children}
    </ul>
  );
}

interface SidebarMobileProps {
  readonly children: ReactNode;
  readonly title?: string;
}

export function SidebarMobile({ children, title }: SidebarMobileProps) {
  const { isMobile, mobileOpen, setMobileOpen } = useSidebar();

  if (!isMobile) {
    return null;
  }

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen} title={title}>
      {children}
    </Sheet>
  );
}
