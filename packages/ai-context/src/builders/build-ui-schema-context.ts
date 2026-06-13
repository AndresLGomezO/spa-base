import type { DesignLayoutSurface } from "@repo/entities";
import {
  componentKindsForSurface,
  type UiComponentKind,
} from "@repo/ui-builder-core";

import {
  UI_DATA_SOURCES_ATOM_ID,
  UI_LAYOUT_BASE_ATOM_ID,
  UI_STYLE_RULES_ATOM_ID,
} from "../atoms/ui/layout-document.js";
import {
  componentSupportsConditionalStyles,
  UI_CONDITIONAL_STYLES_ATOM_ID,
} from "../atoms/ui/conditional-styles.js";
import {
  componentSupportsLabelConfig,
  UI_LABEL_CONFIG_ATOM_ID,
} from "../atoms/ui/label-config.js";
import {
  componentSupportsMetricBindings,
  UI_METRIC_BINDINGS_ATOM_ID,
} from "../atoms/ui/metric-bindings.js";
import { UI_MOTION_ATOM_ID } from "../atoms/ui/motion.js";
import { UI_RESPONSIVE_VISIBILITY_ATOM_ID } from "../atoms/ui/responsive-visibility.js";
import { UI_STYLE_LAYERS_ATOM_ID } from "../atoms/ui/style-layers.js";
import { componentAtomId } from "../generate/component-descriptions.js";
import { SURFACE_VARIANTS } from "../generate/surface-variants.js";
import { getCombinedStaticFragments } from "../generated/load-generated.js";

export type ListViewType = "table" | "card" | "expandableTable";
export type FormPresentation = "plain" | "wizard";

export interface UiSchemaContextScope {
  readonly surface: DesignLayoutSurface;
  readonly listViewType?: ListViewType;
  readonly formPresentation?: FormPresentation;
}

const SURFACE_TO_DESIGN_SURFACE: Record<
  DesignLayoutSurface,
  Parameters<typeof componentKindsForSurface>[0]
> = {
  list: "listItem",
  forms: "formPlain",
  mainPage: "mainPage",
  recordDetail: "recordDetail",
  metricsRowDesigner: "metricRow",
};

const ALL_LIST_VIEW_TYPES: readonly ListViewType[] = [
  "table",
  "card",
  "expandableTable",
];

const LIST_FRAGMENT_BY_TYPE: Record<ListViewType, string> = {
  table: "ui.surface.list.table",
  card: "ui.surface.list.card",
  expandableTable: "ui.surface.list.expandableTable",
};

const FORM_FRAGMENT_BY_PRESENTATION: Record<FormPresentation, string> = {
  plain: "ui.surface.forms.plain",
  wizard: "ui.surface.forms.wizard",
};

const MAIN_SURFACE_FRAGMENT: Record<
  Exclude<DesignLayoutSurface, "list" | "forms">,
  string
> = {
  mainPage: "ui.surface.mainPage",
  recordDetail: "ui.surface.recordDetail",
  metricsRowDesigner: "ui.surface.metricsRow",
};

export function isListPresentationSelectionMode(
  scope: UiSchemaContextScope,
): boolean {
  return scope.surface === "list" && scope.listViewType === undefined;
}

function resolveListComponentKinds(
  listType: ListViewType,
): readonly UiComponentKind[] {
  if (listType === "card") {
    return [...componentKindsForSurface("listItem")];
  }
  if (listType === "expandableTable") {
    return [
      ...new Set([
        ...componentKindsForSurface("tableColumnCell"),
        ...componentKindsForSurface("tableRowExpand"),
      ]),
    ];
  }
  return [...componentKindsForSurface("tableColumnCell")];
}

export function resolveSurfaceFragmentIds(
  scope: UiSchemaContextScope,
): readonly string[] {
  if (scope.surface === "list") {
    if (isListPresentationSelectionMode(scope)) {
      return ALL_LIST_VIEW_TYPES.map(
        (listType) => LIST_FRAGMENT_BY_TYPE[listType],
      );
    }
    const listType = scope.listViewType ?? "table";
    return [LIST_FRAGMENT_BY_TYPE[listType]];
  }
  if (scope.surface === "forms") {
    const presentation = scope.formPresentation ?? "plain";
    return [FORM_FRAGMENT_BY_PRESENTATION[presentation]];
  }
  return [MAIN_SURFACE_FRAGMENT[scope.surface]];
}

export function resolveAllowedComponentKinds(
  scope: UiSchemaContextScope,
): readonly UiComponentKind[] {
  if (scope.surface === "list") {
    if (isListPresentationSelectionMode(scope)) {
      return [
        ...new Set(
          ALL_LIST_VIEW_TYPES.flatMap((listType) =>
            resolveListComponentKinds(listType),
          ),
        ),
      ];
    }
    const listType = scope.listViewType ?? "table";
    return resolveListComponentKinds(listType);
  }

  if (scope.surface === "forms") {
    const presentation = scope.formPresentation ?? "plain";
    if (presentation === "wizard") {
      return [
        ...new Set([
          ...componentKindsForSurface("formWizardShell"),
          ...componentKindsForSurface("formWizardStep"),
        ]),
      ];
    }
    return [...componentKindsForSurface("formPlain")];
  }

  const designSurface = SURFACE_TO_DESIGN_SURFACE[scope.surface];
  return [...componentKindsForSurface(designSurface)];
}

function includeFragment(
  selected: Record<string, string>,
  allFragments: Record<string, string>,
  id: string,
): void {
  const content = allFragments[id];
  if (content) {
    selected[id] = content;
  }
}

export function buildUiSchemaContext(
  scope: UiSchemaContextScope,
): Record<string, string> {
  const allFragments = getCombinedStaticFragments();
  const selected: Record<string, string> = {};

  const alwaysOnIds = [
    UI_LAYOUT_BASE_ATOM_ID,
    UI_RESPONSIVE_VISIBILITY_ATOM_ID,
    UI_DATA_SOURCES_ATOM_ID,
    UI_STYLE_LAYERS_ATOM_ID,
    UI_MOTION_ATOM_ID,
    UI_STYLE_RULES_ATOM_ID,
  ];
  for (const id of alwaysOnIds) {
    includeFragment(selected, allFragments, id);
  }

  const allowedKinds = resolveAllowedComponentKinds(scope);

  if (allowedKinds.some(componentSupportsLabelConfig)) {
    includeFragment(selected, allFragments, UI_LABEL_CONFIG_ATOM_ID);
  }

  if (allowedKinds.some(componentSupportsConditionalStyles)) {
    includeFragment(selected, allFragments, UI_CONDITIONAL_STYLES_ATOM_ID);
  }

  if (allowedKinds.some(componentSupportsMetricBindings)) {
    includeFragment(selected, allFragments, UI_METRIC_BINDINGS_ATOM_ID);
  }

  for (const surfaceId of resolveSurfaceFragmentIds(scope)) {
    includeFragment(selected, allFragments, surfaceId);
  }

  for (const kind of allowedKinds) {
    includeFragment(selected, allFragments, componentAtomId(kind));
  }

  return selected;
}

export function listRegisteredSurfaceFragmentIds(): readonly string[] {
  return SURFACE_VARIANTS.map((spec) => spec.fragmentId);
}
