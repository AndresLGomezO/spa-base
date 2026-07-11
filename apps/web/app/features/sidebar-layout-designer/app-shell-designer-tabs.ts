import type { DesignSurface } from "@repo/ui-builder-core";

export const APP_SHELL_FOCUS_IDS = ["sidebar", "header", "footer"] as const;

export type AppShellDesignFocus = (typeof APP_SHELL_FOCUS_IDS)[number];

export const APP_SHELL_FOCUS_SEARCH_PARAM = "focus";

function isAppShellDesignFocus(value: string): value is AppShellDesignFocus {
  return (APP_SHELL_FOCUS_IDS as readonly string[]).includes(value);
}

export function parseAppShellDesignFocus(
  focusValue: string | null,
): AppShellDesignFocus {
  if (focusValue && isAppShellDesignFocus(focusValue)) {
    return focusValue;
  }
  return "sidebar";
}

export function appShellDesignFocusToSurface(
  focus: AppShellDesignFocus,
): DesignSurface {
  switch (focus) {
    case "sidebar":
      return "sidebarLayout";
    case "header":
      return "headerLayout";
    case "footer":
      return "footerLayout";
  }
}

export function applyAppShellFocusToSearchParams(
  searchParams: URLSearchParams,
  focus: AppShellDesignFocus,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (focus === "sidebar") {
    next.delete(APP_SHELL_FOCUS_SEARCH_PARAM);
  } else {
    next.set(APP_SHELL_FOCUS_SEARCH_PARAM, focus);
  }
  return next;
}
