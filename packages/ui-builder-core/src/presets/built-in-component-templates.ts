import type { DesignSurface } from "../types/design-surface.js";
import type { UiLayoutDocument } from "../types/layout.js";

export type BuiltInComponentTemplateId =
  | "plain-form"
  | "plain-table-list"
  | "card-list"
  | "expandable-table-list"
  | "wizard-form"
  | "kpi-strip";

export interface BuiltInComponentTemplateDefinition {
  readonly id: BuiltInComponentTemplateId;
  readonly label: string;
  readonly description: string;
  readonly surfaces: readonly DesignSurface[];
  readonly isDefault?: boolean;
}

export interface BuiltInComponentTemplate extends BuiltInComponentTemplateDefinition {
  readonly layout: UiLayoutDocument;
}

export const BUILT_IN_TEMPLATE_DEFINITIONS: readonly BuiltInComponentTemplateDefinition[] =
  [
    {
      id: "plain-form",
      label: "Plain form",
      description: "Default create/edit form with fields and actions.",
      surfaces: ["formPlain", "formCreate", "formEdit", "formWizardStep"],
      isDefault: true,
    },
    {
      id: "plain-table-list",
      label: "Plain table list",
      description: "Default list item cell with labeled field text.",
      surfaces: ["listItem"],
      isDefault: true,
    },
    {
      id: "card-list",
      label: "Card list",
      description: "Two-track card layout with actions.",
      surfaces: ["listItem"],
    },
    {
      id: "expandable-table-list",
      label: "Expandable row",
      description: "Row expand panel for grouped table rows.",
      surfaces: ["listItem", "tableRowExpand"],
    },
    {
      id: "wizard-form",
      label: "Wizard form",
      description: "Multi-step wizard shell with progress and step host.",
      surfaces: ["formWizardShell"],
    },
    {
      id: "kpi-strip",
      label: "KPI strip",
      description: "Horizontal metric KPI row.",
      surfaces: ["metricRow", "metricStrip"],
    },
  ];
