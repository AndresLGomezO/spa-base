export type WizardProgressVariant = "steps" | "bar" | "stepper";

export const WIZARD_PROGRESS_VARIANTS = [
  "steps",
  "bar",
  "stepper",
] as const satisfies readonly WizardProgressVariant[];

export function describeWizardProgressVariant(
  variant: WizardProgressVariant,
): string {
  switch (variant) {
    case "steps":
      return "vertical step list with labels (default in app)";
    case "bar":
      return "linear progress bar across the top";
    case "stepper":
      return "numbered circle stepper with connectors";
  }
}

/** Maps blueprint visualTheme keywords to a preferred wizard-progress variant. */
export function resolveWizardProgressVariantFromTheme(
  visualTheme: string | undefined,
): WizardProgressVariant | undefined {
  if (!visualTheme?.trim()) {
    return undefined;
  }

  const normalized = visualTheme.toLowerCase();

  if (
    /\b(progress bar|progress-bar|linear|bar track|minimal header|top bar)\b/.test(
      normalized,
    )
  ) {
    return "bar";
  }

  if (
    /\b(stepper|numbered|circles|horizontal step|left-rail stepper)\b/.test(
      normalized,
    )
  ) {
    return "stepper";
  }

  if (
    /\b(step list|list items|vertical|sidebar|left-rail|nav pills|pill nav)\b/.test(
      normalized,
    )
  ) {
    return "steps";
  }

  if (normalized.includes("left-rail")) {
    return "steps";
  }

  if (normalized.includes("stepper") || normalized.includes("progress")) {
    return "stepper";
  }

  return undefined;
}

/** @deprecated Use resolveWizardProgressVariantFromTheme instead. */
export function blueprintPrefersStepperProgress(
  visualTheme: string | undefined,
): boolean {
  return resolveWizardProgressVariantFromTheme(visualTheme) === "stepper";
}

export function wizardProgressVariantHint(
  variant: WizardProgressVariant | undefined,
): string {
  if (variant) {
    return ` Prefer wizard-progress variant "${variant}" (${describeWizardProgressVariant(variant)}).`;
  }
  return ' Choose wizard-progress variant "steps" (step list), "bar" (progress bar), or "stepper" (numbered circles) to match the blueprint visualTheme and user goals.';
}
