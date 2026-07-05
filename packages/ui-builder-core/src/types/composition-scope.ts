/**
 * Maps fine-grained design surfaces to composition scopes.
 * @see docs/UI-Builder-unification-master-plan.md §6
 */
import type { CompositionScope } from "./composition.js";
import type { DesignSurface } from "./design-surface.js";

const SURFACE_SCOPE_MAP: Readonly<Record<DesignSurface, CompositionScope>> = {
  metricWidget: "component",
  tableColumnCell: "component",
  tableRowExpand: "block",
  listItem: "block",
  metricRow: "block",
  metricStrip: "block",
  formPlain: "block",
  formWizardStep: "section",
  dashboardSection: "section",
  mainPage: "screen",
  recordDetail: "screen",
  formCreate: "section",
  formEdit: "section",
  formWizardShell: "screen",
  formModalFooter: "section",
  dashboardLayout: "screen",
};

export function resolveCompositionScope(
  surface: DesignSurface,
): CompositionScope {
  return SURFACE_SCOPE_MAP[surface];
}

export function isScreenScope(surface: DesignSurface): boolean {
  return resolveCompositionScope(surface) === "screen";
}
