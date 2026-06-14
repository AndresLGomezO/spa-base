import type { WizardStepMeta } from "../../types.js";

export interface DefinedWizardStepInput {
  readonly id: string;
  readonly label: string;
  readonly readOnly?: boolean;
}

function isReviewStep(step: DefinedWizardStepInput): boolean {
  return (
    step.readOnly === true || step.label.trim().toLowerCase().includes("review")
  );
}

export function allocateFieldsDetermistically(
  wizardSteps: readonly DefinedWizardStepInput[],
  formFieldPaths: readonly string[],
  maxFieldsPerStep = 4,
): WizardStepMeta[] {
  const fieldsLeft = [...formFieldPaths];
  const result: WizardStepMeta[] = [];

  for (const step of wizardSteps) {
    if (isReviewStep(step)) {
      result.push({
        id: step.id,
        label: step.label,
        fieldPaths: [],
        readOnly: true,
      });
      continue;
    }

    const bucket: string[] = [];
    while (bucket.length < maxFieldsPerStep && fieldsLeft.length > 0) {
      bucket.push(fieldsLeft.shift()!);
    }

    result.push({
      id: step.id,
      label: step.label,
      fieldPaths: bucket,
    });
  }

  if (fieldsLeft.length > 0) {
    const editableSteps = result.filter((step) => !step.readOnly);
    const target =
      editableSteps[editableSteps.length - 1] ?? result[result.length - 1];
    if (target) {
      const existing = target.fieldPaths ?? [];
      const remaining = fieldsLeft.splice(
        0,
        Math.max(0, maxFieldsPerStep - existing.length),
      );
      const index = result.findIndex((step) => step.id === target.id);
      if (index >= 0) {
        result[index] = {
          ...result[index]!,
          fieldPaths: [...existing, ...remaining],
        };
      }
    }
  }

  return result;
}

export function isUnknownWizardStepIdError(error: string): boolean {
  return error.startsWith('Unknown wizard step id "');
}
