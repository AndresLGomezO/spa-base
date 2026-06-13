export const MAX_STEP_RETRIES = 2;
export const MAX_NESTED_DEPTH = 3;
export const MAX_TOTAL_STEPS = 60;
export const STEP_COOLDOWN_MS = 300;

export const UI_BUILDER_STEP_MAX_OUTPUT_TOKENS = 4096;

const LIST_STEP_PREFIXES = {
  selectViewType: "list.selectViewType",
  tableSelectFields: "list.tableSelectFields",
  expandableDefineColumns: "list.expandableDefineColumns",
  layoutSkeleton: "list.layoutSkeleton",
  configureComponent: "list.configureComponent",
} as const;

/** Per-step output budgets — selection steps stay tiny; skeleton/configure get headroom. */
export function getStepMaxOutputTokens(stepId: string): number {
  if (stepId.startsWith(LIST_STEP_PREFIXES.selectViewType)) {
    return 512;
  }
  if (stepId.startsWith(LIST_STEP_PREFIXES.tableSelectFields)) {
    return 2048;
  }
  if (stepId.startsWith(LIST_STEP_PREFIXES.expandableDefineColumns)) {
    return 4096;
  }
  if (stepId.startsWith(LIST_STEP_PREFIXES.layoutSkeleton)) {
    return 8192;
  }
  if (stepId.startsWith(LIST_STEP_PREFIXES.configureComponent)) {
    return 4096;
  }
  return UI_BUILDER_STEP_MAX_OUTPUT_TOKENS;
}

export const TRUNCATED_RESPONSE_ERROR =
  "Model response was truncated (max output tokens reached).";
