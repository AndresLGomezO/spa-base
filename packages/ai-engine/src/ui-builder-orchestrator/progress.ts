export interface OrchestratorProgress {
  readonly stepIndex: number;
  readonly totalSteps: number;
  readonly stepId: string;
  readonly stepLabel: string;
  readonly phase: string;
}

export function buildProgress(
  stepIndex: number,
  totalSteps: number,
  step: { readonly id: string; readonly label: string; readonly phase: string },
): OrchestratorProgress {
  return {
    stepIndex,
    totalSteps,
    stepId: step.id,
    stepLabel: step.label,
    phase: step.phase,
  };
}
