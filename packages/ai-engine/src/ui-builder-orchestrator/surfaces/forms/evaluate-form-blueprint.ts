import type { FormBlueprint } from "./forms-blueprint.schema.js";

export interface BlueprintEvaluation {
  readonly score: number;
  readonly reject: boolean;
  readonly reasons: readonly string[];
}

const ACCEPT_SCORE_THRESHOLD = 3;

export function evaluateFormBlueprint(
  blueprint: FormBlueprint,
  formFieldCount: number,
): BlueprintEvaluation {
  const reasons: string[] = [];
  let score = 0;

  if (blueprint.conceptName.trim().length === 0) {
    reasons.push("conceptName is empty");
  } else if (blueprint.conceptName.trim().length > 5) {
    score += 1;
  }

  if (blueprint.presentation === "plain" && blueprint.steps.length === 1) {
    reasons.push("plain presentation with only one step is too minimal");
  }

  for (const step of blueprint.steps) {
    const maxFields = step.maxFields ?? 4;
    if (maxFields > 6) {
      reasons.push(`step "${step.id}" maxFields exceeds 6`);
    }
  }

  if (
    blueprint.presentation === "wizard" &&
    formFieldCount >= 6 &&
    blueprint.steps.length < 2
  ) {
    reasons.push(
      "wizard blueprint needs at least 2 steps for field-rich entities",
    );
  }

  if (blueprint.steps.length >= 3) {
    score += 1;
  }

  if (blueprint.visualTheme?.trim()) {
    score += 1;
  }

  if (blueprint.steps.some((step) => step.helper?.trim())) {
    score += 1;
  }

  const lastStep = blueprint.steps[blueprint.steps.length - 1];
  if (
    lastStep?.readOnly === true ||
    lastStep?.label.toLowerCase().includes("review")
  ) {
    score += 1;
  }

  const reject = reasons.length > 0 || score < ACCEPT_SCORE_THRESHOLD;

  return { score, reject, reasons };
}
