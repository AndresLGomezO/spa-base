import { assembleUiBuilderStepContext } from "@repo/ai-context";

import { describeHierarchyContext } from "../../layout-path.js";
import type {
  ListUiBuilderDraft,
  StepContextInput,
  SurfaceRecipeContext,
  UiBuilderStep,
} from "../../types.js";
import {
  LIST_STEP_TYPES,
  STEP_OUTPUT_INSTRUCTIONS,
  stepTypeFromStep,
} from "./list-steps.js";

function taskDescriptionForStep(step: UiBuilderStep): string {
  switch (step.type) {
    case LIST_STEP_TYPES.SELECT_VIEW_TYPE:
      return "Choose the single best listViewType for this entity and user goals. Favor card when the user wants a premium, visual, differentiated list or when image/logo fields exist.";
    case LIST_STEP_TYPES.TABLE_SELECT_FIELDS:
      return "Select table column field paths in display order. Use direct entity field names such as providerId (not provider.name). Relation labels are resolved automatically in table views. Order columns for scanability: name/identifier first, status and key metrics next.";
    case LIST_STEP_TYPES.EXPANDABLE_DEFINE_COLUMNS:
      return "Define grouped table columns: id, header label, responsive visibility, and optional summaryField. Give columns human-friendly labels and prioritize a visual primary summary column.";
    case LIST_STEP_TYPES.LAYOUT_SKELETON: {
      const pathKey = String(step.payload?.pathKey ?? "");
      if (pathKey === "listItem") {
        return "Design a visually rich card listItem skeleton. Return components that will live inside the root container — for multi-column cards use one nested-layout with 2–3 columns. Lead with image (if an image/file field exists in allowed paths) or icon in the first column; place bold title text, colorful badge status, and date/numeric metadata in remaining slots. Do not produce a flat text-only skeleton.";
      }
      return `Design an expressive component skeleton for ${pathKey}. Prefer image/icon + badge + metadata mix over plain text rows. Return kinds, field paths, and responsive visibility only — no full component props.`;
    }
    case LIST_STEP_TYPES.CONFIGURE_COMPONENT: {
      const kind = String(step.payload?.kind ?? "component");
      const pathKey = String(step.payload?.pathKey ?? "");
      const fieldPath =
        typeof step.payload?.fieldPath === "string"
          ? step.payload.fieldPath
          : "";
      return `Configure a polished ${kind} component for ${pathKey} at ${String(step.payload?.componentPath ?? "")}${fieldPath ? ` (field: ${fieldPath})` : ""}. Make it visually distinctive: apply theme-aware styles, conditionalStyles for status/badge values, thoughtful labels, and sizing (imageSize, displayFormat). Aim for best-in-class SaaS card craft — not a bare minimum field binding.`;
    }
    default:
      return "Complete the current UI builder step.";
  }
}

export function buildListStepContext(
  step: UiBuilderStep,
  context: SurfaceRecipeContext,
): StepContextInput {
  const draft = context.draft as ListUiBuilderDraft;
  const stepType = stepTypeFromStep(step);
  const pathKey =
    typeof step.payload?.pathKey === "string"
      ? step.payload.pathKey
      : undefined;

  const assembled = assembleUiBuilderStepContext({
    stepType: step.type,
    listViewType: draft.listViewType,
    componentKind:
      step.type === LIST_STEP_TYPES.CONFIGURE_COMPONENT
        ? String(step.payload?.kind ?? "")
        : undefined,
    hierarchyContext: pathKey
      ? describeHierarchyContext(draft, pathKey)
      : undefined,
    allowedLayoutFieldPaths:
      step.type === LIST_STEP_TYPES.EXPANDABLE_DEFINE_COLUMNS ||
      step.type === LIST_STEP_TYPES.LAYOUT_SKELETON
        ? context.layoutFieldPaths
        : undefined,
    allowedTableFieldPaths:
      step.type === LIST_STEP_TYPES.TABLE_SELECT_FIELDS
        ? context.tableFieldPaths
        : undefined,
    taskDescription: taskDescriptionForStep(step),
    entityTenantFragment: context.entityTenantFragment,
    entityCatalogFragment: context.entityCatalogFragment,
    entityCurrentFragment: context.entityCurrentFragment,
    themeFragments: context.themeFragments,
    userPrompt: context.userPrompt,
  });

  return {
    systemInstruction: assembled.systemInstruction,
    contextBlocks: assembled.contextBlocks,
    userText: assembled.userText,
    outputInstruction: STEP_OUTPUT_INSTRUCTIONS[stepType],
  };
}
