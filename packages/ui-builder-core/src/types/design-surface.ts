/**
 * @ai-context-sync
 * When changing design surfaces or allowed component kinds, run: pnpm generate:ai-context
 * Affected fragments: ui.surface.*
 */
import type { UiComponentKind } from "./component.js";

export type DesignSurface =
  | "listItem"
  | "tableColumnCell"
  | "tableRowExpand"
  | "mainPage"
  | "recordDetail"
  | "formCreate"
  | "formEdit"
  | "formPlain"
  | "formWizardShell"
  | "formWizardStep"
  | "formModalFooter"
  | "metricStrip"
  | "metricRow"
  | "metricWidget"
  | "dashboardSection"
  | "dashboardLayout";

const VIEW_FILTER_KINDS: readonly UiComponentKind[] = ["view-filter"];

const LIST_ITEM_KINDS: readonly UiComponentKind[] = [
  "text",
  "image",
  "icon",
  "date",
  "numeric",
  "badge",
  "metric-kpi",
  ...VIEW_FILTER_KINDS,
];

const METRIC_ROW_KINDS: readonly UiComponentKind[] = [
  ...LIST_ITEM_KINDS,
  "metric-widget",
];

const MAIN_PAGE_KINDS: readonly UiComponentKind[] = [
  "page-header",
  "page-toolbar",
  "page-metrics",
  "page-list",
  ...VIEW_FILTER_KINDS,
];

const RECORD_DETAIL_KINDS: readonly UiComponentKind[] = [
  ...LIST_ITEM_KINDS,
  "related-records",
];

const FORM_PLAIN_KINDS: readonly UiComponentKind[] = [
  "form-field",
  "entity-field-selector",
  "form-section",
  "form-actions",
];

const FORM_WIZARD_SHELL_KINDS: readonly UiComponentKind[] = [
  "wizard-progress",
  "wizard-step-host",
  "wizard-actions",
  "text",
  "image",
  "icon",
  "date",
  "numeric",
  "badge",
];

const FORM_WIZARD_STEP_KINDS: readonly UiComponentKind[] = [
  "form-field",
  "entity-field-selector",
  "form-section",
  "text",
  "image",
  "icon",
  "date",
  "numeric",
  "badge",
];

const FORM_MODAL_FOOTER_EXCLUDED_KINDS = new Set<UiComponentKind>([
  "wizard-step-host",
  "form-actions",
]);

function mergeComponentKinds(
  ...groups: readonly (readonly UiComponentKind[])[]
): readonly UiComponentKind[] {
  const merged = new Set<UiComponentKind>();

  for (const group of groups) {
    for (const kind of group) {
      if (!FORM_MODAL_FOOTER_EXCLUDED_KINDS.has(kind)) {
        merged.add(kind);
      }
    }
  }

  return [...merged];
}

const DASHBOARD_CONTENT_KINDS: readonly UiComponentKind[] = [
  "text",
  "image",
  "icon",
  "user",
  "metric-widget",
  ...VIEW_FILTER_KINDS,
];

const DASHBOARD_LAYOUT_KINDS: readonly UiComponentKind[] = [
  ...DASHBOARD_CONTENT_KINDS,
  "dashboard-section",
];

const FORM_MODAL_FOOTER_KINDS = mergeComponentKinds(
  FORM_PLAIN_KINDS,
  FORM_WIZARD_SHELL_KINDS,
  FORM_WIZARD_STEP_KINDS,
);

export function componentKindsForSurface(
  surface: DesignSurface,
): readonly UiComponentKind[] {
  switch (surface) {
    case "listItem":
    case "tableColumnCell":
    case "tableRowExpand":
    case "metricStrip":
    case "dashboardSection":
      return DASHBOARD_CONTENT_KINDS;
    case "metricRow":
      return METRIC_ROW_KINDS;
    case "metricWidget":
      return LIST_ITEM_KINDS;
    case "dashboardLayout":
      return DASHBOARD_LAYOUT_KINDS;
    case "mainPage":
      return MAIN_PAGE_KINDS;
    case "recordDetail":
      return RECORD_DETAIL_KINDS;
    case "formCreate":
    case "formEdit":
    case "formPlain":
      return FORM_PLAIN_KINDS;
    case "formWizardShell":
      return FORM_WIZARD_SHELL_KINDS;
    case "formWizardStep":
      return FORM_WIZARD_STEP_KINDS;
    case "formModalFooter":
      return FORM_MODAL_FOOTER_KINDS;
  }
}

/** Structural kinds insertable on any design surface (matches component catalog). */
const UNIVERSAL_SURFACE_COMPONENT_KINDS = new Set<UiComponentKind>([
  "container",
]);

export function isComponentKindAllowedOnSurface(
  kind: UiComponentKind,
  surface: DesignSurface,
): boolean {
  if (UNIVERSAL_SURFACE_COMPONENT_KINDS.has(kind)) {
    return true;
  }

  return componentKindsForSurface(surface).includes(kind);
}
