import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyLayout,
} from "../builder/mutations.js";
import { createDefaultListCardLayout } from "../builder/list-card-defaults.js";
import { createDefaultRowExpandLayout } from "../builder/row-expand-defaults.js";
import { beginContainerRootLayout } from "../layout/ensure-container-root.js";
import { createDefaultWizardShellLayout } from "../layout/default-wizard-form-layout.js";
import type { DesignSurface } from "../types/design-surface.js";
import type { UiLayoutDocument } from "../types/layout.js";
import type { BuiltInComponentTemplateId } from "./built-in-component-templates.js";
import {
  BUILT_IN_TEMPLATE_DEFINITIONS,
  type BuiltInComponentTemplate,
} from "./built-in-component-templates.js";

export interface BuiltInTemplateContext {
  readonly fieldPaths: readonly string[];
}

export type ListPresentationKind = "card" | "expandableTable";

const DEFAULT_FIELD_PATHS = ["name"] as const;

function createPlainFormLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  const { layout: beganLayout, containerLocator } = beginContainerRootLayout();
  let layout = beganLayout;

  for (const fieldPath of fieldPaths) {
    layout = addComponentRowAt(
      layout,
      containerLocator,
      createDefaultComponent("form-field", fieldPath),
    );
  }

  return addComponentRowAt(
    layout,
    containerLocator,
    createDefaultComponent("form-actions"),
  );
}

function createKpiStripLayout(fieldPaths: readonly string[]): UiLayoutDocument {
  const primaryField = fieldPaths[0] ?? "name";
  return addComponentRowAt(
    createEmptyLayout(1),
    { scope: "root", columnIndex: 0 },
    createDefaultComponent("metric-kpi", primaryField),
  );
}

const TEMPLATE_FACTORIES: Record<
  BuiltInComponentTemplateId,
  (context: BuiltInTemplateContext) => UiLayoutDocument
> = {
  "plain-form": ({ fieldPaths }) => createPlainFormLayout(fieldPaths),
  "card-list": ({ fieldPaths }) => createDefaultListCardLayout(fieldPaths),
  "expandable-table-list": ({ fieldPaths }) =>
    createDefaultRowExpandLayout(fieldPaths),
  "wizard-form": () => createDefaultWizardShellLayout(),
  "kpi-strip": ({ fieldPaths }) => createKpiStripLayout(fieldPaths),
};

/** Builds a layout from the global built-in template registry. */
export function applyBuiltInTemplate(
  id: BuiltInComponentTemplateId,
  context: BuiltInTemplateContext,
): UiLayoutDocument {
  const factory = TEMPLATE_FACTORIES[id];
  return structuredClone(factory(context));
}

export function listBuiltInTemplates(
  surface?: DesignSurface,
  context: BuiltInTemplateContext = { fieldPaths: DEFAULT_FIELD_PATHS },
): readonly BuiltInComponentTemplate[] {
  const definitions = surface
    ? BUILT_IN_TEMPLATE_DEFINITIONS.filter((template) =>
        template.surfaces.includes(surface),
      )
    : BUILT_IN_TEMPLATE_DEFINITIONS;

  return definitions.map((definition) => ({
    ...definition,
    layout: applyBuiltInTemplate(definition.id, context),
  }));
}

export function getBuiltInComponentTemplate(
  id: BuiltInComponentTemplateId,
  context: BuiltInTemplateContext = { fieldPaths: DEFAULT_FIELD_PATHS },
): BuiltInComponentTemplate | undefined {
  const definition = BUILT_IN_TEMPLATE_DEFINITIONS.find(
    (entry) => entry.id === id,
  );
  if (!definition) {
    return undefined;
  }

  return {
    ...definition,
    layout: applyBuiltInTemplate(id, context),
  };
}

export function getDefaultBuiltInTemplateForSurface(
  surface: DesignSurface,
  context: BuiltInTemplateContext = { fieldPaths: DEFAULT_FIELD_PATHS },
): BuiltInComponentTemplate | undefined {
  const definition =
    BUILT_IN_TEMPLATE_DEFINITIONS.find(
      (entry) => entry.surfaces.includes(surface) && entry.isDefault,
    ) ??
    BUILT_IN_TEMPLATE_DEFINITIONS.find((entry) =>
      entry.surfaces.includes(surface),
    );

  return definition
    ? getBuiltInComponentTemplate(definition.id, context)
    : undefined;
}

export function resolveBuiltInTemplatePresentation(
  id: BuiltInComponentTemplateId,
): ListPresentationKind | undefined {
  switch (id) {
    case "card-list":
      return "card";
    case "expandable-table-list":
      return "expandableTable";
    default:
      return undefined;
  }
}

export type FormPresentationKind = "plain" | "wizard";

export function resolveBuiltInFormPresentation(
  id: BuiltInComponentTemplateId,
): FormPresentationKind | undefined {
  switch (id) {
    case "plain-form":
      return "plain";
    case "wizard-form":
      return "wizard";
    default:
      return undefined;
  }
}

export function resolveListBuiltinTemplateId(
  layout: UiLayoutDocument,
  listViewType?: string,
): BuiltInComponentTemplateId | "custom" {
  const derived = deriveListPresentationFromLayout(layout);
  if (derived === "card") {
    return "card-list";
  }
  if (derived === "expandableTable") {
    return "expandable-table-list";
  }
  if (listViewType === "card") {
    return "card-list";
  }
  if (listViewType === "expandableTable" || listViewType === "compact") {
    return "expandable-table-list";
  }
  return "custom";
}

/** Heuristic: infer list presentation from layout document shape. */
export function deriveListPresentationFromLayout(
  layout: UiLayoutDocument,
): ListPresentationKind {
  const serialized = JSON.stringify(layout);

  if (layout.showActions === true && serialized.includes('"kind":"grid"')) {
    return "card";
  }

  if (serialized.includes('"kind":"grid"')) {
    return "expandableTable";
  }

  return "expandableTable";
}
