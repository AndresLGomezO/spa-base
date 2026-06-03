import {
  layoutInlineStyleFromStyleRules,
  splitStyleRuleClasses,
  type WizardActionsComponentConfig,
} from "@repo/ui-builder-core";
import { Button } from "@repo/ui";

import { ENTITY_FORM_ID } from "../entity/entity-form-constants";

interface WizardActionsProps {
  readonly config: WizardActionsComponentConfig;
  readonly mode: "create" | "edit";
  readonly currentStepIndex: number;
  readonly totalSteps: number;
  readonly isSubmitting?: boolean;
  readonly hideActions?: boolean;
  readonly onNext: () => void;
  readonly onBack: () => void;
  readonly onCancel: () => void;
}

export function WizardActions({
  config,
  mode,
  currentStepIndex,
  totalSteps,
  isSubmitting,
  hideActions,
  onNext,
  onBack,
  onCancel,
}: WizardActionsProps) {
  const { containerClassName } = splitStyleRuleClasses(config.styles);
  const style = layoutInlineStyleFromStyleRules(config.styles);
  const isLastStep = currentStepIndex >= totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;

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
      {!isLastStep ? (
        <Button type="button" onClick={onNext}>
          {nextLabel}
        </Button>
      ) : (
        <Button type="submit" form={ENTITY_FORM_ID} loading={isSubmitting}>
          {submitLabel}
        </Button>
      )}
      {!isFirstStep ? (
        <Button type="button" variant="outline" onClick={onBack}>
          {backLabel}
        </Button>
      ) : null}
      <Button type="button" variant="outline" onClick={onCancel}>
        {cancelLabel}
      </Button>
    </div>
  );
}
