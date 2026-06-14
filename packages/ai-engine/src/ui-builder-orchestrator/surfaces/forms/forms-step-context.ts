import { assembleUiBuilderStepContext } from "@repo/ai-context";

import { describeHierarchyContext } from "../../layout-path.js";
import type {
  FormsUiBuilderDraft,
  StepContextInput,
  SurfaceRecipeContext,
  UiBuilderStep,
} from "../../types.js";
import {
  resolveWizardProgressVariantFromTheme,
  wizardProgressVariantHint,
} from "./wizard-progress-variant.js";
import {
  FORMS_STEP_TYPES,
  STEP_OUTPUT_INSTRUCTIONS,
  buildFormsConfigureOutputInstruction,
  stepTypeFromStep,
} from "./forms-steps.js";

const FORMS_STRUCTURAL_KINDS = new Set([
  "form-actions",
  "wizard-progress",
  "wizard-step-host",
  "wizard-actions",
]);

function wizardStepIndexFromPathKey(pathKey: string): number | null {
  const match = pathKey.match(/^wizard\.steps\[(\d+)\]$/);
  if (!match?.[1]) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

function taskDescriptionForStep(
  step: UiBuilderStep,
  draft: FormsUiBuilderDraft,
): string {
  switch (step.type) {
    case FORMS_STEP_TYPES.SELECT_PRESENTATION:
      return "Choose plain or wizard form presentation based on field count and user goals. Prefer wizard when there are more than six form fields.";
    case FORMS_STEP_TYPES.GENERATE_BLUEPRINT:
      return "Draft an imaginative FormBlueprint JSON for this entity. Group fields into wizard steps with helpers and a review step. Do not output layout JSON.";
    case FORMS_STEP_TYPES.DEFINE_WIZARD_STEPS:
      return "Define wizard steps with id and label. Create 2-8 logical steps including a review step at the end.";
    case FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS:
      return "Assign each allowed form field to exactly one wizard step using the exact step ids listed in the defined wizard steps block — do not rename or invent new ids. Target 3 ± 1 fields per step (max 4). Leave the final review step with empty fieldPaths if used.";
    case FORMS_STEP_TYPES.LAYOUT_SKELETON: {
      const pathKey = String(step.payload?.pathKey ?? "");
      if (pathKey === "plain.root") {
        return "Design a plain form skeleton with form-field rows for key entity fields, optional form-section groupings, and form-actions at the end.";
      }
      if (pathKey === "wizard.shell") {
        const progressVariant =
          draft.wizardProgressVariant ??
          resolveWizardProgressVariantFromTheme(
            draft.blueprintVisualTheme ?? draft.formBlueprint?.visualTheme,
          );
        return `Design wizard shell skeleton with wizard-progress, wizard-step-host, and wizard-actions. Nested-layout is allowed for side tips or summary columns.${wizardProgressVariantHint(progressVariant)}`;
      }
      if (pathKey.startsWith("wizard.steps[")) {
        const index = wizardStepIndexFromPathKey(pathKey);
        const stepMeta = index != null ? draft.wizardSteps?.[index] : undefined;
        const fields = stepMeta?.fieldPaths?.length
          ? stepMeta.fieldPaths.join(", ")
          : "fields for this step";
        const helperHint =
          stepMeta?.helperText && stepMeta.helperKind
            ? ` Include a static text ${stepMeta.helperKind} callout: "${stepMeta.helperText}".`
            : "";
        return `Design wizard step layout skeleton for ${pathKey} (${stepMeta?.label ?? "step"}). Include form-section intro, optional static text callout, and form-field rows for: ${fields}.${helperHint}`;
      }
      if (pathKey === "wizard.modalFooter") {
        const footerHint = draft.formBlueprint?.footerLayout?.trim()
          ? ` Blueprint footer: ${draft.formBlueprint.footerLayout}.`
          : "";
        return `Design optional modal footer layout with supplementary actions or summary components.${footerHint}`;
      }
      return `Design form layout skeleton for ${pathKey}.`;
    }
    case FORMS_STEP_TYPES.CONFIGURE_COMPONENT: {
      const kind = String(step.payload?.kind ?? "component");
      const pathKey = String(step.payload?.pathKey ?? "");
      const fieldPath =
        typeof step.payload?.fieldPath === "string"
          ? step.payload.fieldPath
          : "";
      if (kind === "form-field" && fieldPath) {
        return `Configure form-field for ${pathKey} at ${String(step.payload?.componentPath ?? "")} (field: ${fieldPath}). Include concise label text and optional styles.`;
      }
      if (kind === "wizard-progress") {
        const progressVariant =
          draft.wizardProgressVariant ??
          resolveWizardProgressVariantFromTheme(
            draft.blueprintVisualTheme ?? draft.formBlueprint?.visualTheme,
          );
        return `Configure wizard-progress for ${pathKey}.${wizardProgressVariantHint(progressVariant)} Include stepLabel and/or bar colors and conditionalStyles for active/completed/pending states as appropriate for the chosen variant.`;
      }
      if (kind === "text") {
        return `Configure static text callout for ${pathKey}. Use primary.type "static" with theme-aware styles.`;
      }
      if (FORMS_STRUCTURAL_KINDS.has(kind)) {
        return `Configure ${kind} for ${pathKey}. Styles allowed when they improve layout.`;
      }
      if (kind === "form-section") {
        return `Configure form-section for ${pathKey}. Return kind and title with optional styles.`;
      }
      return `Configure ${kind} for ${pathKey} at ${String(step.payload?.componentPath ?? "")}${fieldPath ? ` (field: ${fieldPath})` : ""}.`;
    }
    default:
      return "Complete the current UI builder step.";
  }
}

function allowedFormFieldPathsForStep(
  step: UiBuilderStep,
  context: SurfaceRecipeContext,
  draft: FormsUiBuilderDraft,
): readonly string[] | undefined {
  if (step.type !== FORMS_STEP_TYPES.LAYOUT_SKELETON) {
    return undefined;
  }

  const pathKey =
    typeof step.payload?.pathKey === "string" ? step.payload.pathKey : "";
  const index = wizardStepIndexFromPathKey(pathKey);
  if (index == null) {
    return context.formFieldPaths;
  }

  const stepFields = draft.wizardSteps?.[index]?.fieldPaths;
  if (stepFields && stepFields.length > 0) {
    return stepFields;
  }

  return context.formFieldPaths;
}

function formBlueprintJsonForContext(
  draft: FormsUiBuilderDraft,
): string | undefined {
  if (!draft.formBlueprint) {
    return undefined;
  }
  return JSON.stringify(draft.formBlueprint, null, 2);
}

function definedWizardStepsJsonForContext(
  step: UiBuilderStep,
  draft: FormsUiBuilderDraft,
): string | undefined {
  if (step.type !== FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS) {
    return undefined;
  }
  if (!draft.wizardSteps || draft.wizardSteps.length === 0) {
    return undefined;
  }
  return JSON.stringify(
    draft.wizardSteps.map(({ id, label }) => ({ id, label })),
    null,
    2,
  );
}

export function buildFormsStepContext(
  step: UiBuilderStep,
  context: SurfaceRecipeContext,
): StepContextInput {
  const draft = context.draft as FormsUiBuilderDraft;
  const stepType = stepTypeFromStep(step);
  const pathKey =
    typeof step.payload?.pathKey === "string"
      ? step.payload.pathKey
      : undefined;

  const componentKind =
    step.type === FORMS_STEP_TYPES.CONFIGURE_COMPONENT
      ? String(step.payload?.kind ?? "")
      : undefined;
  const fieldPath =
    typeof step.payload?.fieldPath === "string"
      ? step.payload.fieldPath
      : undefined;

  const assembled = assembleUiBuilderStepContext({
    stepType: step.type,
    formPresentation: draft.presentation ?? context.formPresentation,
    presentationHint: context.presentationHint,
    componentKind,
    hierarchyContext: pathKey
      ? describeHierarchyContext(draft, pathKey)
      : undefined,
    allowedFormFieldPaths: allowedFormFieldPathsForStep(step, context, draft),
    formBlueprintJson: formBlueprintJsonForContext(draft),
    definedWizardStepsJson: definedWizardStepsJsonForContext(step, draft),
    taskDescription: taskDescriptionForStep(step, draft),
    entityTenantFragment: context.entityTenantFragment,
    entityCatalogFragment: context.entityCatalogFragment,
    entityCurrentFragment: context.entityCurrentFragment,
    themeFragments: context.themeFragments,
    userPrompt: context.userPrompt,
  });

  const progressVariant =
    draft.wizardProgressVariant ??
    resolveWizardProgressVariantFromTheme(
      draft.blueprintVisualTheme ?? draft.formBlueprint?.visualTheme,
    );

  return {
    systemInstruction: assembled.systemInstruction,
    contextBlocks: assembled.contextBlocks,
    userText: assembled.userText,
    outputInstruction:
      step.type === FORMS_STEP_TYPES.CONFIGURE_COMPONENT && componentKind
        ? buildFormsConfigureOutputInstruction(componentKind, fieldPath, {
            wizardProgressVariant: progressVariant,
          })
        : STEP_OUTPUT_INSTRUCTIONS[stepType],
  };
}
