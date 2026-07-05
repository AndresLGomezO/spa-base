export const DASHBOARD_LAYOUT_DESIGNER_TAB_IDS = ["design"] as const;

export type DashboardLayoutDesignerTabId =
  (typeof DASHBOARD_LAYOUT_DESIGNER_TAB_IDS)[number];

export const DASHBOARD_LAYOUT_DESIGNER_TAB_SEARCH_PARAM = "tab";

export const DASHBOARD_LAYOUT_DESIGNER_FOCUS_SEARCH_PARAM = "focus";

export const DASHBOARD_LAYOUT_DESIGNER_FOCUS_IDS = [
  "sections",
  "shell",
] as const;

export type DashboardLayoutDesignFocus =
  (typeof DASHBOARD_LAYOUT_DESIGNER_FOCUS_IDS)[number];

function isDashboardLayoutDesignFocus(
  value: string,
): value is DashboardLayoutDesignFocus {
  return (DASHBOARD_LAYOUT_DESIGNER_FOCUS_IDS as readonly string[]).includes(
    value,
  );
}

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
  if (
    value === "sections" ||
    value === "layout" ||
    (value && isDashboardLayoutDesignerTabId(value))
  ) {
    return "design";
  }
  return "design";
}

export function parseDashboardLayoutDesignFocus(
  tabValue: string | null,
  focusValue: string | null,
): DashboardLayoutDesignFocus {
  if (focusValue && isDashboardLayoutDesignFocus(focusValue)) {
    return focusValue;
  }
  if (tabValue === "layout") {
    return "shell";
  }
  return "sections";
}

export function isShellLayoutFocus(focus: DashboardLayoutDesignFocus): boolean {
  return focus === "shell";
}
