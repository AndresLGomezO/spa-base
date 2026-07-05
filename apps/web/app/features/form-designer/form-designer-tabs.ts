export const FORM_DESIGNER_TAB_IDS = ["settings", "design"] as const;

export type FormDesignerTabId = (typeof FORM_DESIGNER_TAB_IDS)[number];

export const FORM_DESIGNER_TAB_SEARCH_PARAM = "tab";

export function isFormDesignerTabId(value: string): value is FormDesignerTabId {
  return (FORM_DESIGNER_TAB_IDS as readonly string[]).includes(value);
}

export function parseFormDesignerTabId(
  value: string | null,
): FormDesignerTabId {
  if (value === "layout" || value === "components") {
    return "design";
  }
  if (value && isFormDesignerTabId(value)) {
    return value;
  }
  return "settings";
}
