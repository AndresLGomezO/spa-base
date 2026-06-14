import { z } from "zod";

export const FORMS_RENDER_STEP_TYPES = {
  COMPOSE_HTML: "formsRender.composeHtml",
  REFINE_HTML: "formsRender.refineHtml",
  /** @deprecated Legacy Imagen step — kept for timeline compat */
  COMPOSE_BRIEF: "formsRender.composeBrief",
  REFINE_BRIEF: "formsRender.refineBrief",
  GENERATE_IMAGE: "formsRender.generateImage",
} as const;

export const formsRenderHtmlOutputSchema = z.object({
  htmlDocument: z.string().trim().min(1).max(200_000),
  layoutSummary: z.string().trim().min(1).max(2000),
});

export type FormsRenderHtmlOutput = z.infer<typeof formsRenderHtmlOutputSchema>;

export const formsRenderWizardDesignStepSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200).optional(),
  subtitle: z.string().trim().max(500).optional(),
  helperText: z.string().trim().max(1000).optional(),
});

/** Lightweight design JSON from the model — no embedded HTML (assembled server-side). */
export const formsRenderWizardDesignOutputSchema = z.object({
  wizardTitle: z.string().trim().min(1).max(200),
  wizardSubtitle: z.string().trim().min(1).max(500),
  sharedStyles: z.string().trim().max(8_000).optional(),
  steps: z.array(formsRenderWizardDesignStepSchema).min(1).max(20),
  layoutSummary: z.string().trim().min(1).max(2000),
});

export type FormsRenderWizardDesignOutput = z.infer<
  typeof formsRenderWizardDesignOutputSchema
>;

export const formsRenderWizardStepSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(500).optional(),
  panelHtml: z.string().trim().min(1).max(80_000),
});

export const formsRenderWizardOutputSchema = z.object({
  wizardTitle: z.string().trim().min(1).max(200),
  wizardSubtitle: z.string().trim().min(1).max(500),
  sharedStyles: z.string().trim().min(1).max(80_000),
  sidebarHtml: z.string().trim().min(1).max(40_000),
  steps: z.array(formsRenderWizardStepSchema).min(1).max(20),
  layoutSummary: z.string().trim().min(1).max(2000),
});

export type FormsRenderWizardOutput = z.infer<
  typeof formsRenderWizardOutputSchema
>;

/** Accept legacy model output that still embeds HTML parts. */
export function isLegacyWizardHtmlOutput(
  value: unknown,
): value is FormsRenderWizardOutput {
  return formsRenderWizardOutputSchema.safeParse(value).success;
}

/** @deprecated Legacy brief schema */
export const formsRenderBriefOutputSchema = formsRenderHtmlOutputSchema;

export type FormsRenderBriefOutput = FormsRenderHtmlOutput;

export interface FormsRenderStep {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly phase: string;
}

export function createComposeHtmlStep(): FormsRenderStep {
  return {
    id: FORMS_RENDER_STEP_TYPES.COMPOSE_HTML,
    type: FORMS_RENDER_STEP_TYPES.COMPOSE_HTML,
    label: "Generating HTML form",
    phase: "render",
  };
}

export function createRefineHtmlStep(): FormsRenderStep {
  return {
    id: FORMS_RENDER_STEP_TYPES.REFINE_HTML,
    type: FORMS_RENDER_STEP_TYPES.REFINE_HTML,
    label: "Refining HTML form",
    phase: "render",
  };
}
