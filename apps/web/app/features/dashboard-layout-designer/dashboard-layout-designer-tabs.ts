export const DASHBOARD_LAYOUT_DESIGNER_TAB_IDS = [
  "sections",
  "layout",
] as const;

export type DashboardLayoutDesignerTabId =
  (typeof DASHBOARD_LAYOUT_DESIGNER_TAB_IDS)[number];

export const DASHBOARD_LAYOUT_DESIGNER_TAB_SEARCH_PARAM = "tab";

export function isDashboardLayoutDesignerTabId(
  value: string,
): value is DashboardLayoutDesignerTabId {
  return (DASHBOARD_LAYOUT_DESIGNER_TAB_IDS as readonly string[]).includes(
    value,
  );
}

export function parseDashboardLayoutDesignerTabId(
  value: string | null,
): DashboardLayoutDesignerTabId {
  if (value && isDashboardLayoutDesignerTabId(value)) {
    return value;
  }
  return "sections";
}
