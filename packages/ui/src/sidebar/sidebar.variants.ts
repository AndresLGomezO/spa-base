import { cn } from "@repo/theme/utils";

const sidebarMenuButtonSizes = {
  default: "h-9 px-2 text-sm",
  lg: "h-auto min-h-12 px-2 py-2 text-sm group-data-[collapsible=icon]/sidebar:h-10 group-data-[collapsible=icon]/sidebar:min-h-0",
} as const;

export type SidebarMenuButtonSize = keyof typeof sidebarMenuButtonSizes;

export function sidebarMenuButtonClassName({
  isActive = false,
  size = "default",
  className,
}: {
  readonly isActive?: boolean;
  readonly size?: SidebarMenuButtonSize;
  readonly className?: string;
} = {}): string {
  return cn(
    "box-border flex !w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left font-normal transition-colors",
    "text-sidebar-foreground hover:bg-sidebar-highlight hover:text-sidebar-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40",
    "group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:px-2",
    isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
    sidebarMenuButtonSizes[size],
    className,
  );
}
