import { MAX_TOTAL_STEPS, STEP_COOLDOWN_MS } from "./limits.js";
import { buildProgress } from "./progress.js";
import { runStepWithRetries } from "./step-runner.js";
import { appendStepsAfterMerge } from "./surfaces/list/list-recipe.js";
import { sleep } from "../vertex-retry.js";
import type {
  ListUiBuilderDraft,
  RunOrchestratorOptions,
  OrchestratorResult,
  StepValidationResult,
  UiBuilderStep,
} from "./types.js";

export async function runOrchestrator(
  options: RunOrchestratorOptions,
): Promise<OrchestratorResult> {
  const { recipe, context, callbacks, vertexConfig } = options;
  let draft = context.draft as ListUiBuilderDraft;
  const queue: UiBuilderStep[] = [
    ...(options.initialSteps ?? recipe.createInitialSteps(context)),
  ];
  let executedSteps = 0;

  while (queue.length > 0) {
    if (executedSteps >= MAX_TOTAL_STEPS) {
      throw new Error(
        `UI builder exceeded maximum step count (${MAX_TOTAL_STEPS}).`,
      );
    }

    const step = queue.shift()!;
    executedSteps += 1;
    const totalSteps = executedSteps + queue.length;

    await callbacks.onProgress(buildProgress(executedSteps, totalSteps, step));

    const stepContext = recipe.buildStepContext(step, {
      ...context,
      draft,
    });

    const validation = await runStepWithRetries(
      {
        vertexConfig,
        stepContext,
        stepId: step.id,
      },
      (raw): StepValidationResult =>
        recipe.validateStepOutput(step, raw, { ...context, draft }),
    );

    draft = recipe.mergeStepIntoDraft(
      step,
      validation.data,
      draft,
      validation.appendSteps,
    );
    draft = {
      ...draft,
      completedStepIds: [...draft.completedStepIds, step.id],
    };

    await callbacks.onDraftUpdate(draft);

    const stepsToAppend = appendStepsAfterMerge(
      step,
      draft,
      validation.appendSteps ?? [],
    );
    if (stepsToAppend.length > 0) {
      queue.push(...stepsToAppend);
      await sleep(STEP_COOLDOWN_MS);
    }
  }

  return {
    output: {
      summary: `Completed ${executedSteps} orchestration steps for ${draft.surface} surface.`,
      stepCount: executedSteps,
    },
    draft,
  };
}
