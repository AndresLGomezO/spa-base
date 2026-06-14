import { z } from "zod";

import type { StepValidationResult } from "../../types.js";
import type { RenderWizardPlan } from "./build-render-wizard-plan.js";
import {
  buildWizardHtmlFromDesign,
  normalizeWizardDesignSteps,
} from "./build-wizard-html-from-design.js";
import { assembleFormsRenderWizardHtml } from "./assemble-forms-render-wizard-html.js";
import {
  formsRenderHtmlOutputSchema,
  formsRenderWizardDesignOutputSchema,
  isLegacyWizardHtmlOutput,
  type FormsRenderHtmlOutput,
  type FormsRenderWizardDesignOutput,
} from "./forms-render-steps.js";
import { sanitizeFormsRenderHtml } from "./sanitize-forms-render-html.js";

export interface FormsRenderValidatedOutput {
  readonly html: string;
  readonly layoutSummary: string;
  readonly output: FormsRenderHtmlOutput | FormsRenderWizardDesignOutput;
}

function zodErrors(error: z.ZodError): readonly string[] {
  return error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );
}

export function validateFormsRenderStepOutput(
  parsed: unknown,
  useWizardMode: boolean,
  wizardPlan?: RenderWizardPlan,
): StepValidationResult {
  try {
    if (useWizardMode && wizardPlan) {
      const htmlFallback = formsRenderHtmlOutputSchema.safeParse(parsed);
      if (htmlFallback.success) {
        const result: FormsRenderValidatedOutput = {
          html: sanitizeFormsRenderHtml(htmlFallback.data.htmlDocument),
          layoutSummary: htmlFallback.data.layoutSummary,
          output: htmlFallback.data,
        };
        return { ok: true, data: result };
      }

      if (isLegacyWizardHtmlOutput(parsed)) {
        const html = assembleFormsRenderWizardHtml(parsed);
        const output = normalizeWizardDesignSteps(wizardPlan, {
          wizardTitle: parsed.wizardTitle,
          wizardSubtitle: parsed.wizardSubtitle,
          steps: parsed.steps.map((step) => ({
            id: step.id,
            title: step.title,
            ...(step.subtitle ? { subtitle: step.subtitle } : {}),
          })),
          layoutSummary: parsed.layoutSummary,
        });
        return {
          ok: true,
          data: {
            html,
            layoutSummary: parsed.layoutSummary,
            output,
          },
        };
      }

      const validated = formsRenderWizardDesignOutputSchema.parse(parsed);
      const normalized = normalizeWizardDesignSteps(wizardPlan, validated);
      const html = buildWizardHtmlFromDesign(wizardPlan, normalized);
      return {
        ok: true,
        data: {
          html,
          layoutSummary: normalized.layoutSummary,
          output: normalized,
        },
      };
    }

    const validated = formsRenderHtmlOutputSchema.parse(parsed);
    return {
      ok: true,
      data: {
        html: sanitizeFormsRenderHtml(validated.htmlDocument),
        layoutSummary: validated.layoutSummary,
        output: validated,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, errors: zodErrors(error) };
    }
    if (error instanceof Error) {
      return { ok: false, errors: [error.message] };
    }
    return { ok: false, errors: ["Unknown validation error"] };
  }
}
