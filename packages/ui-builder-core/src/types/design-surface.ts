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
  | "metricStrip";

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
  "date",
  "numeric",
  "badge",
];

const FORM_MODAL_FOOTER_KINDS: readonly UiComponentKind[] = [
  "form-actions",
  "wizard-actions",
];

export function componentKindsForSurface(
  surface: DesignSurface,
): readonly UiComponentKind[] {
  switch (surface) {
    case "listItem":
    case "tableColumnCell":
    case "tableRowExpand":
    case "metricStrip":
      return LIST_ITEM_KINDS;
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

export function isComponentKindAllowedOnSurface(
  kind: UiComponentKind,
  surface: DesignSurface,
): boolean {
  return componentKindsForSurface(surface).includes(kind);
}
