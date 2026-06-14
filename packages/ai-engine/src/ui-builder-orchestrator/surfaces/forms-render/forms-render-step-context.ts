import {
  ENTITY_CURRENT_FRAGMENT_ID,
  FORMS_RENDER_COMPOSE_SYSTEM_INSTRUCTION,
  FORMS_RENDER_MOCKUP_GUIDANCE,
  FORMS_RENDER_MOCKUP_GUIDANCE_FRAGMENT_ID,
  FORMS_RENDER_REFINE_SYSTEM_INSTRUCTION,
  FORMS_RENDER_WIZARD_COMPOSE_SYSTEM_INSTRUCTION,
  FORMS_RENDER_WIZARD_REFINE_SYSTEM_INSTRUCTION,
  FORMS_RENDER_WIZARD_SHELL_GUIDANCE,
  FORMS_RENDER_WIZARD_SHELL_GUIDANCE_FRAGMENT_ID,
} from "@repo/ai-context";

import type { FormPresentationChoice } from "../../types.js";
import type { RenderWizardPlan } from "./build-render-wizard-plan.js";
import { serializeRenderWizardPlan } from "./build-render-wizard-plan.js";
import type { FormsRenderStep } from "./forms-render-steps.js";
import { FORMS_RENDER_STEP_TYPES } from "./forms-render-steps.js";

export interface BuildFormsRenderStepContextInput {
  readonly step: FormsRenderStep;
  readonly entityCurrentFragment: string;
  readonly userPrompt: string;
  readonly presentationHint?: FormPresentationChoice;
  readonly modificationRequest?: string;
  readonly previousHtmlDocument?: string;
  readonly wizardPlan?: RenderWizardPlan;
  readonly useWizardMode?: boolean;
  readonly iterationNumber?: number;
}

export interface FormsRenderStepContext {
  readonly systemInstruction: string;
  readonly contextBlocks: readonly {
    readonly id: string;
    readonly content: string;
  }[];
  readonly userText: string;
  readonly outputInstruction: string;
}

function buildMinimalContextBlocks(
  input: BuildFormsRenderStepContextInput,
): Array<{ id: string; content: string }> {
  const useWizard = input.useWizardMode === true;
  const blocks: Array<{ id: string; content: string }> = [
    {
      id: useWizard
        ? FORMS_RENDER_WIZARD_SHELL_GUIDANCE_FRAGMENT_ID
        : FORMS_RENDER_MOCKUP_GUIDANCE_FRAGMENT_ID,
      content: useWizard
        ? FORMS_RENDER_WIZARD_SHELL_GUIDANCE
        : FORMS_RENDER_MOCKUP_GUIDANCE,
    },
    {
      id: ENTITY_CURRENT_FRAGMENT_ID,
      content: input.entityCurrentFragment,
    },
  ];

  if (input.wizardPlan) {
    blocks.push({
      id: "step.wizardPlan",
      content: serializeRenderWizardPlan(input.wizardPlan),
    });
  }

  if (input.presentationHint) {
    blocks.push({
      id: "step.presentation",
      content: `Form presentation: ${input.presentationHint}`,
    });
  }

  if (input.userPrompt.trim()) {
    blocks.push({ id: "user.prompt", content: input.userPrompt.trim() });
  }

  if ((input.iterationNumber ?? 0) > 0) {
    blocks.push({
      id: "step.renderIteration",
      content: `Render iteration ${(input.iterationNumber ?? 0) + 1} (refinement of a prior preview).`,
    });
  }

  return blocks.filter((block) => block.content.trim().length > 0);
}

export function buildFormsRenderStepContext(
  input: BuildFormsRenderStepContextInput,
): FormsRenderStepContext {
  const isRefine =
    input.step.type === FORMS_RENDER_STEP_TYPES.REFINE_HTML ||
    input.step.type === FORMS_RENDER_STEP_TYPES.REFINE_BRIEF;
  const useWizard = input.useWizardMode === true;

  const blocks = buildMinimalContextBlocks(input);

  if (isRefine) {
    if (input.previousHtmlDocument?.trim()) {
      blocks.push({
        id: "step.previousHtmlDocument",
        content: input.previousHtmlDocument.trim(),
      });
    }
    if (input.modificationRequest?.trim()) {
      blocks.push({
        id: "user.modificationRequest",
        content: input.modificationRequest.trim(),
      });
    }

    return {
      systemInstruction: useWizard
        ? FORMS_RENDER_WIZARD_REFINE_SYSTEM_INSTRUCTION
        : FORMS_RENDER_REFINE_SYSTEM_INSTRUCTION,
      contextBlocks: blocks,
      userText: "Refine the form render preview per the modification request.",
      outputInstruction: useWizard
        ? "Return ONLY valid JSON with wizardTitle, wizardSubtitle, optional sharedStyles (CSS only), steps, and layoutSummary. Never embed HTML."
        : "Return ONLY valid JSON with htmlDocument and layoutSummary.",
    };
  }

  return {
    systemInstruction: useWizard
      ? FORMS_RENDER_WIZARD_COMPOSE_SYSTEM_INSTRUCTION
      : FORMS_RENDER_COMPOSE_SYSTEM_INSTRUCTION,
    contextBlocks: blocks,
    userText: "Generate the form render preview for this entity.",
    outputInstruction: useWizard
      ? "Return ONLY valid JSON with wizardTitle, wizardSubtitle, optional sharedStyles (CSS only), steps, and layoutSummary. Never embed HTML."
      : "Return ONLY valid JSON with htmlDocument and layoutSummary.",
  };
}
