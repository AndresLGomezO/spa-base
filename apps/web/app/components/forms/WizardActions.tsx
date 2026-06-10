import {
  layoutInlineStyleFromStyleRules,
  splitStyleRuleClasses,
  type WizardActionsComponentConfig,
} from "@repo/ui-builder-core";
import { Button } from "@repo/ui";

interface WizardActionsProps {
  readonly config: WizardActionsComponentConfig;
  readonly mode: "create" | "edit";
  readonly currentStepIndex: number;
  readonly totalSteps: number;
  readonly isSubmitting?: boolean;
  readonly isCurrentStepValid?: boolean;
  readonly hideActions?: boolean;
  readonly onNext: () => void;
  readonly onBack: () => void;
  readonly onCancel: () => void;
  readonly onSubmit?: () => void;
}

export function WizardActions({
  config,
  mode,
  currentStepIndex,
  totalSteps,
  isSubmitting,
  isCurrentStepValid = true,
  hideActions,
  onNext,
  onBack,
  onCancel,
  onSubmit,
}: WizardActionsProps) {
  const { containerClassName } = splitStyleRuleClasses(config.styles);
  const style = layoutInlineStyleFromStyleRules(config.styles);
  const isLastStep = currentStepIndex >= totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;
  const stepActionsDisabled = isSubmitting || !isCurrentStepValid;

  const nextLabel = config.nextLabel ?? "Next";
  const backLabel = config.backLabel ?? "Back";
  const cancelLabel = config.cancelLabel ?? "Cancel";
  const submitLabel =
    mode === "create"
      ? (config.submitCreateLabel ?? "Create")
      : (config.submitEditLabel ?? "Save");

  if (hideActions) {
    return null;
  }

  return (
    <div
      className={["flex flex-wrap items-center gap-3", containerClassName]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {!isFirstStep ? (
        <Button type="button" variant="outline" onClick={onBack}>
          {backLabel}
        </Button>
      ) : null}
      {!isLastStep ? (
        <Button type="button" onClick={onNext} disabled={stepActionsDisabled}>
          {nextLabel}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={stepActionsDisabled}
          loading={isSubmitting}
        >
          {submitLabel}
        </Button>
      )}
      <Button type="button" variant="outline" onClick={onCancel}>
        {cancelLabel}
      </Button>
    </div>
  );
}
