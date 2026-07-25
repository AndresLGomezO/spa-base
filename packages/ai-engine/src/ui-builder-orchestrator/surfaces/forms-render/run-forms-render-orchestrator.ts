import { buildProgress } from "../../progress.js";
import { runStepWithRetries } from "../../step-runner.js";
import type {
  FormPresentationChoice,
  OrchestratorCallbacks,
} from "../../types.js";
import type { VertexAiConfig } from "../../../vertex-ai.client.js";
import {
  buildRenderWizardPlan,
  shouldUseRenderWizardMode,
  type RenderWizardPlan,
} from "./build-render-wizard-plan.js";
import { buildFormsRenderStepContext } from "./forms-render-step-context.js";
import { sanitizeRenderTraceContextBlocks } from "./forms-render-trace-context.js";
import {
  createComposeHtmlStep,
  createRefineHtmlStep,
  type FormsRenderHtmlOutput,
  type FormsRenderWizardDesignOutput,
} from "./forms-render-steps.js";
import {
  validateFormsRenderStepOutput,
  type FormsRenderValidatedOutput,
} from "./forms-render-validate-output.js";

export interface FormsRenderDraft {
  readonly surface: "forms";
  readonly outputMode: "render";
  readonly entityName: string;
  readonly userPrompt: string;
  readonly renderOutput?: FormsRenderHtmlOutput | FormsRenderWizardDesignOutput;
  readonly renderHtml?: string;
  readonly completedStepIds: readonly string[];
}

export interface RunFormsRenderOrchestratorInput {
  readonly vertexConfig: VertexAiConfig;
  readonly entityName: string;
  readonly userPrompt: string;
  readonly presentationHint?: FormPresentationChoice;
  readonly modificationRequest?: string;
  readonly previousHtmlDocument?: string;
  readonly iterationNumber?: number;
  readonly entityCurrentFragment: string;
  readonly formFieldPaths: readonly string[];
  readonly callbacks: OrchestratorCallbacks;
  readonly generateAnswer?: import("../../step-runner.js").GenerateAnswerFn;
}

export interface RunFormsRenderOrchestratorResult {
  readonly output: { readonly summary: string; readonly stepCount: number };
  readonly draft: FormsRenderDraft;
  readonly renderHtml: string;
  readonly renderBrief: string;
  readonly layoutSummary: string;
  readonly iterationNumber: number;
}

interface RenderBriefPayload {
  readonly layoutSummary: string;
  readonly presentation: FormPresentationChoice;
  readonly wizardSteps?: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
  }>;
}

async function runHtmlStep(
  input: RunFormsRenderOrchestratorInput,
  isRefinement: boolean,
  useWizardMode: boolean,
  wizardPlan: RenderWizardPlan | undefined,
  draftBeforeStep: FormsRenderDraft,
): Promise<FormsRenderValidatedOutput> {
  const step = isRefinement ? createRefineHtmlStep() : createComposeHtmlStep();
  const stepContext = buildFormsRenderStepContext({
    step,
    entityCurrentFragment: input.entityCurrentFragment,
    userPrompt: input.userPrompt,
    useWizardMode,
    iterationNumber: input.iterationNumber,
    ...(input.presentationHint
      ? { presentationHint: input.presentationHint }
      : {}),
    ...(wizardPlan ? { wizardPlan } : {}),
    ...(input.modificationRequest
      ? { modificationRequest: input.modificationRequest }
      : {}),
    ...(input.previousHtmlDocument
      ? { previousHtmlDocument: input.previousHtmlDocument }
      : {}),
  });

  const validation = await runStepWithRetries(
    {
      vertexConfig: input.vertexConfig,
      stepContext,
      stepId: step.id,
      draftBeforeStep,
      ...(input.generateAnswer ? { generateAnswer: input.generateAnswer } : {}),
      ...(input.callbacks.onStepTrace
        ? {
            onAttempt: async (entry) => {
              await input.callbacks.onStepTrace!({
                ...entry,
                contextBlocks: sanitizeRenderTraceContextBlocks(
                  entry.contextBlocks,
                ),
                draftBeforeStep: entry.draftBeforeStep ?? draftBeforeStep,
              });
            },
          }
        : {}),
    },
    (parsed) =>
      validateFormsRenderStepOutput(parsed, useWizardMode, wizardPlan),
  );

  return validation.data as FormsRenderValidatedOutput;
}

function buildRenderBrief(
  layoutSummary: string,
  presentation: FormPresentationChoice,
  wizardPlan?: RenderWizardPlan,
): string {
  const payload: RenderBriefPayload = {
    layoutSummary,
    presentation,
    ...(wizardPlan
      ? {
          wizardSteps: wizardPlan.steps.map((step) => ({
            id: step.id,
            label: step.label,
          })),
        }
      : {}),
  };
  return JSON.stringify(payload);
}

export async function runFormsRenderOrchestrator(
  input: RunFormsRenderOrchestratorInput,
): Promise<RunFormsRenderOrchestratorResult> {
  const isRefinement = Boolean(
    input.previousHtmlDocument?.trim() || input.modificationRequest?.trim(),
  );
  const step = isRefinement ? createRefineHtmlStep() : createComposeHtmlStep();
  const iterationNumber = input.iterationNumber ?? 0;

  const useWizardMode = shouldUseRenderWizardMode(
    input.formFieldPaths,
    input.presentationHint,
  );
  const wizardPlan = useWizardMode
    ? buildRenderWizardPlan(input.formFieldPaths)
    : undefined;
  const presentation: FormPresentationChoice = useWizardMode
    ? "wizard"
    : "plain";

  const draftBeforeStep: FormsRenderDraft = {
    surface: "forms",
    outputMode: "render",
    entityName: input.entityName,
    userPrompt: input.userPrompt,
    completedStepIds: [],
  };

  await input.callbacks.onProgress(buildProgress(1, 1, step));

  const renderResult = await runHtmlStep(
    input,
    isRefinement,
    useWizardMode,
    wizardPlan,
    draftBeforeStep,
  );

  const draft: FormsRenderDraft = {
    surface: "forms",
    outputMode: "render",
    entityName: input.entityName,
    userPrompt: input.userPrompt,
    renderOutput: renderResult.output,
    renderHtml: renderResult.html,
    completedStepIds: [step.id],
  };

  if (input.callbacks.onStepMerged) {
    await input.callbacks.onStepMerged(
      step.id,
      draft as unknown as import("../../types.js").UiBuilderDraft,
    );
  }

  await input.callbacks.onDraftUpdate(
    draft as unknown as import("../../types.js").UiBuilderDraft,
  );

  return {
    output: {
      summary: renderResult.layoutSummary,
      stepCount: 1,
    },
    draft,
    renderHtml: renderResult.html,
    renderBrief: buildRenderBrief(
      renderResult.layoutSummary,
      presentation,
      wizardPlan,
    ),
    layoutSummary: renderResult.layoutSummary,
    iterationNumber,
  };
}
