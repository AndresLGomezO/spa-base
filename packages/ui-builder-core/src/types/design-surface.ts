import type { UiComponentKind } from "./component.js";

export type DesignSurface =
  | "listItem"
  | "mainPage"
  | "recordDetail"
  | "formCreate"
  | "formEdit";

const LIST_ITEM_KINDS: readonly UiComponentKind[] = [
  "text",
  "image",
  "date",
  "numeric",
  "badge",
  "metric-kpi",
];

const MAIN_PAGE_KINDS: readonly UiComponentKind[] = [
  "page-header",
  "page-toolbar",
  "page-metrics",
  "page-list",
];

const RECORD_DETAIL_KINDS: readonly UiComponentKind[] = [
  ...LIST_ITEM_KINDS,
  "related-records",
];

const FORM_KINDS: readonly UiComponentKind[] = [
  "form-field",
  "form-section",
  "form-actions",
];

export function componentKindsForSurface(
  surface: DesignSurface,
): readonly UiComponentKind[] {
  switch (surface) {
    case "listItem":
      return LIST_ITEM_KINDS;
    case "mainPage":
      return MAIN_PAGE_KINDS;
    case "recordDetail":
      return RECORD_DETAIL_KINDS;
    case "formCreate":
    case "formEdit":
      return FORM_KINDS;
  }
}

export function isComponentKindAllowedOnSurface(
  kind: UiComponentKind,
  surface: DesignSurface,
): boolean {
  return componentKindsForSurface(surface).includes(kind);
}
