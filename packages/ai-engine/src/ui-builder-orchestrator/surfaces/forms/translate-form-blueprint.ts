import type { WizardStepMeta } from "../../types.js";
import type {
  FormBlueprint,
  FormBlueprintStep,
} from "./forms-blueprint.schema.js";

export type { WizardProgressVariant } from "./wizard-progress-variant.js";
export {
  blueprintPrefersStepperProgress,
  describeWizardProgressVariant,
  resolveWizardProgressVariantFromTheme,
  wizardProgressVariantHint,
} from "./wizard-progress-variant.js";

export type BlueprintHelperKind = "info-box" | "callout-warning";

export interface ParsedBlueprintHelper {
  readonly helperKind: BlueprintHelperKind;
  readonly helperText: string;
}

export function parseBlueprintHelper(
  helper: string | undefined,
): ParsedBlueprintHelper | undefined {
  if (!helper?.trim()) {
    return undefined;
  }

  const trimmed = helper.trim();
  const shortMatch = trimmed.match(/^(info|warning|tip)$/i);
  if (shortMatch?.[1]) {
    const kind = shortMatch[1].toLowerCase();
    if (kind === "info" || kind === "tip") {
      return { helperKind: "info-box", helperText: "" };
    }
    if (kind === "warning") {
      return { helperKind: "callout-warning", helperText: "" };
    }
  }

  const match = trimmed.match(/^([a-z-]+)\s*->\s*['"](.+)['"]\s*$/i);
  if (!match?.[1] || !match[2]) {
    return undefined;
  }

  const kind = match[1].trim().toLowerCase();
  if (kind === "info-box" || kind === "info" || kind === "tip") {
    return { helperKind: "info-box", helperText: match[2].trim() };
  }
  if (kind === "callout-warning" || kind === "warning") {
    return { helperKind: "callout-warning", helperText: match[2].trim() };
  }

  return undefined;
}

function isReviewStep(step: FormBlueprintStep): boolean {
  return (
    step.readOnly === true || step.label.trim().toLowerCase().includes("review")
  );
}

export function translateBlueprintToWizardSteps(
  blueprint: FormBlueprint,
  formFieldPaths: readonly string[],
): WizardStepMeta[] {
  const fieldsLeft = [...formFieldPaths];
  const result: WizardStepMeta[] = [];

  for (const step of blueprint.steps) {
    const parsedHelper = parseBlueprintHelper(step.helper);
    const maxFields = step.maxFields ?? 4;

    if (isReviewStep(step)) {
      result.push({
        id: step.id,
        label: step.label,
        fieldPaths: [],
        readOnly: true,
        ...(parsedHelper
          ? {
              helperKind: parsedHelper.helperKind,
              helperText: parsedHelper.helperText,
            }
          : {}),
      });
      continue;
    }

    const bucket: string[] = [];
    while (bucket.length < maxFields && fieldsLeft.length > 0) {
      bucket.push(fieldsLeft.shift()!);
    }

    result.push({
      id: step.id,
      label: step.label,
      fieldPaths: bucket,
      ...(parsedHelper
        ? {
            helperKind: parsedHelper.helperKind,
            helperText: parsedHelper.helperText,
          }
        : {}),
    });
  }

  if (fieldsLeft.length > 0) {
    const editableSteps = result.filter((step) => !step.readOnly);
    const target =
      editableSteps[editableSteps.length - 1] ?? result[result.length - 1];
    if (target) {
      const existing = target.fieldPaths ?? [];
      const remaining = fieldsLeft.splice(0, Math.max(0, 4 - existing.length));
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
