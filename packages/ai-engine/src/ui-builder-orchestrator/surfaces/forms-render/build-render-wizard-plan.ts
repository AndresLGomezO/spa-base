import { WIZARD_FIELD_THRESHOLD } from "../../limits.js";
import type { FormPresentationChoice } from "../../types.js";

export interface RenderWizardPlanStep {
  readonly id: string;
  readonly label: string;
  readonly fieldPaths: readonly string[];
  readonly readOnly?: boolean;
}

export interface RenderWizardPlan {
  readonly presentation: "wizard";
  readonly steps: readonly RenderWizardPlanStep[];
}

const REVIEW_STEP_ID = "step-review";
const REVIEW_STEP_LABEL = "Review & Confirm";
const MAX_FIELDS_PER_STEP = 3;

function humanizeSegment(segment: string): string {
  return segment
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function buildEditableStepGroups(
  formFieldPaths: readonly string[],
): string[][] {
  const prefixGroups = new Map<string, string[]>();

  for (const path of formFieldPaths) {
    const key = path.includes(".") ? path.split(".")[0]! : "__flat__";
    const bucket = prefixGroups.get(key) ?? [];
    bucket.push(path);
    prefixGroups.set(key, bucket);
  }

  const groups: string[][] = [];
  for (const paths of prefixGroups.values()) {
    for (let index = 0; index < paths.length; index += MAX_FIELDS_PER_STEP) {
      groups.push(paths.slice(index, index + MAX_FIELDS_PER_STEP));
    }
  }

  return groups.length > 0 ? groups : [[]];
}

function deriveStepLabelFromGroup(
  fieldPaths: readonly string[],
  stepIndex: number,
): string {
  if (fieldPaths.length === 0) {
    return stepIndex === 0 ? "Basic Information" : `Step ${stepIndex + 1}`;
  }

  const prefixes = fieldPaths.map((path) =>
    path.includes(".") ? path.split(".")[0]! : null,
  );
  const uniquePrefixes = [...new Set(prefixes.filter(Boolean))] as string[];

  if (uniquePrefixes.length === 1) {
    return humanizeSegment(uniquePrefixes[0]!);
  }

  if (stepIndex === 0) {
    return "Basic Information";
  }

  return `Step ${stepIndex + 1}`;
}

export function buildRenderWizardPlan(
  formFieldPaths: readonly string[],
): RenderWizardPlan {
  const editableGroups = buildEditableStepGroups(formFieldPaths);

  const editableSteps: RenderWizardPlanStep[] = editableGroups.map(
    (fieldPaths, index) => ({
      id: `step-${index + 1}`,
      label: deriveStepLabelFromGroup(fieldPaths, index),
      fieldPaths,
    }),
  );

  return {
    presentation: "wizard",
    steps: [
      ...editableSteps,
      {
        id: REVIEW_STEP_ID,
        label: REVIEW_STEP_LABEL,
        fieldPaths: [],
        readOnly: true,
      },
    ],
  };
}

export function shouldUseRenderWizardMode(
  formFieldPaths: readonly string[],
  presentationHint?: FormPresentationChoice,
): boolean {
  if (presentationHint === "wizard") {
    return true;
  }
  if (presentationHint === "plain") {
    return false;
  }
  return formFieldPaths.length >= WIZARD_FIELD_THRESHOLD;
}

export function serializeRenderWizardPlan(plan: RenderWizardPlan): string {
  return JSON.stringify(plan, null, 2);
}
