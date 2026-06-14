import type { AiJobStepTraceEntry } from "../schemas/ai-job.schema.js";

export function annotateStepTraceDraftAfter(
  trace: readonly AiJobStepTraceEntry[],
  stepId: string,
  draftAfterStep: unknown,
): AiJobStepTraceEntry[] {
  let lastOkIndex = -1;
  for (let index = trace.length - 1; index >= 0; index -= 1) {
    const entry = trace[index];
    if (entry?.stepId === stepId && entry.validationOk) {
      lastOkIndex = index;
      break;
    }
  }
  if (lastOkIndex < 0) {
    return [...trace];
  }
  return trace.map((entry, index) =>
    index === lastOkIndex ? { ...entry, draftAfterStep } : entry,
  );
}

export function createOrchestratorTraceCallbacks(
  enabled: boolean,
  persist: (trace: readonly AiJobStepTraceEntry[]) => Promise<void>,
): {
  readonly trace: AiJobStepTraceEntry[];
  readonly callbacks: {
    readonly onStepTrace: (entry: AiJobStepTraceEntry) => Promise<void>;
    readonly onStepMerged: (
      stepId: string,
      draftAfter: unknown,
    ) => Promise<void>;
  };
} {
  const trace: AiJobStepTraceEntry[] = [];

  return {
    trace,
    callbacks: {
      onStepTrace: async (entry) => {
        if (!enabled) {
          return;
        }
        trace.push(entry);
        await persist([...trace]);
      },
      onStepMerged: async (stepId, draftAfter) => {
        if (!enabled || trace.length === 0) {
          return;
        }
        const next = annotateStepTraceDraftAfter(trace, stepId, draftAfter);
        trace.length = 0;
        trace.push(...next);
        await persist([...trace]);
      },
    },
  };
}
