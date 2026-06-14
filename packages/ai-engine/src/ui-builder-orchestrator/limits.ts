export const MAX_STEP_RETRIES = 2;
export const MAX_NESTED_DEPTH = 3;
export const MAX_TOTAL_STEPS = 60;
export const STEP_COOLDOWN_MS = 300;
export const WIZARD_FIELD_THRESHOLD = 6;

export const UI_BUILDER_STEP_MAX_OUTPUT_TOKENS = 4096;

/** Render compose/refine returns design JSON or HTML — needs headroom. */
export const FORMS_RENDER_STEP_MAX_OUTPUT_TOKENS = 16_384;

const LIST_STEP_PREFIXES = {
  selectViewType: "list.selectViewType",
  tableSelectFields: "list.tableSelectFields",
  expandableDefineColumns: "list.expandableDefineColumns",
  layoutSkeleton: "list.layoutSkeleton",
  configureComponent: "list.configureComponent",
} as const;

const FORMS_STEP_PREFIXES = {
  selectPresentation: "forms.selectPresentation",
  generateBlueprint: "forms.generateBlueprint",
  defineWizardSteps: "forms.defineWizardSteps",
  layoutSkeleton: "forms.layoutSkeleton",
  configureComponent: "forms.configureComponent",
} as const;

const FORMS_RENDER_STEP_PREFIX = "formsRender.";

/** Per-step output budgets — selection steps stay tiny; skeleton/configure get headroom. */
export function getStepMaxOutputTokens(stepId: string): number {
  if (stepId.startsWith(FORMS_RENDER_STEP_PREFIX)) {
    return FORMS_RENDER_STEP_MAX_OUTPUT_TOKENS;
  }
  if (stepId.startsWith(LIST_STEP_PREFIXES.selectViewType)) {
    return 512;
  }
  if (stepId.startsWith(FORMS_STEP_PREFIXES.selectPresentation)) {
    return 512;
  }
  if (stepId.startsWith(FORMS_STEP_PREFIXES.generateBlueprint)) {
    return 2048;
  }
  if (stepId.startsWith(LIST_STEP_PREFIXES.tableSelectFields)) {
    return 2048;
  }
  if (stepId.startsWith(FORMS_STEP_PREFIXES.defineWizardSteps)) {
    return 2048;
  }
  if (stepId.startsWith(LIST_STEP_PREFIXES.expandableDefineColumns)) {
    return 4096;
  }
  if (
    stepId.startsWith(LIST_STEP_PREFIXES.layoutSkeleton) ||
    stepId.startsWith(FORMS_STEP_PREFIXES.layoutSkeleton)
  ) {
    return 8192;
  }
  if (
    stepId.startsWith(LIST_STEP_PREFIXES.configureComponent) ||
    stepId.startsWith(FORMS_STEP_PREFIXES.configureComponent)
  ) {
    return 4096;
  }
  return UI_BUILDER_STEP_MAX_OUTPUT_TOKENS;
}

/** Per-step temperature — higher for selection/skeleton; lower for deterministic field steps. */
export function getStepTemperature(stepId: string): number {
  if (stepId.startsWith(FORMS_STEP_PREFIXES.generateBlueprint)) {
    return 0.85;
  }
  if (
    stepId.startsWith(LIST_STEP_PREFIXES.selectViewType) ||
    stepId.startsWith(FORMS_STEP_PREFIXES.selectPresentation) ||
    stepId.startsWith(FORMS_STEP_PREFIXES.defineWizardSteps) ||
    stepId.startsWith("forms.allocateFieldsToSteps")
  ) {
    return 0.6;
  }
  if (
    stepId.startsWith(LIST_STEP_PREFIXES.layoutSkeleton) ||
    stepId.startsWith(FORMS_STEP_PREFIXES.layoutSkeleton)
  ) {
    return 0.65;
  }
  if (
    stepId.startsWith(FORMS_STEP_PREFIXES.configureComponent) &&
    !stepId.includes(":form-field:")
  ) {
    return 0.5;
  }
  if (
    stepId.startsWith(LIST_STEP_PREFIXES.configureComponent) &&
    !stepId.includes(":text:")
  ) {
    return 0.5;
  }
  return 0.2;
}

export const TRUNCATED_RESPONSE_ERROR =
  "Model response was truncated (max output tokens reached).";
