import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ensureWizardShellLayout,
  layoutHasInputFields,
  type UiLayoutDocument,
  type WizardActionsComponentConfig,
  type WizardProgressComponentConfig,
  type WizardStepHostComponentConfig,
  type WizardStepStatusKind,
} from "@repo/ui-builder-core";
import {
  RecursiveLayoutRenderer,
  type LayoutRenderContext,
} from "@repo/ui-builder-renderer";
import type {
  FieldAccessLevel,
  SerializableEntityDefinition,
  WizardFormConfig,
} from "@repo/entities";
import { Form } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  formatFieldLabel,
  type EntityName,
} from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { createEntityFormRenderContext } from "../../features/ui-builder/create-entity-form-render-context";
import { WizardActions } from "../forms/WizardActions";
import { WizardProgress } from "../forms/WizardProgress";
import { WizardStepHost } from "../forms/WizardStepHost";
import { ENTITY_FORM_ID } from "./entity-form-constants";
import { useEntityFormModalFooter } from "./use-entity-form-modal-footer";
import {
  collectStepFieldErrors,
  mergeFieldErrors,
  omitFieldErrorsForStep,
  stepHasValidationErrors,
} from "./validate-wizard-step-fields";

interface EntityWizardFormProps {
  readonly entityName: EntityName;
  readonly definition: SerializableEntityDefinition;
  readonly mode: "create" | "edit";
  readonly wizard: WizardFormConfig;
  readonly locale: string;
  readonly values: Record<string, unknown>;
  readonly fieldErrors: Readonly<Record<string, string | undefined>>;
  readonly fieldAccess: Readonly<Record<string, FieldAccessLevel>>;
  readonly canRead: boolean;
  readonly canWrite: boolean;
  readonly recordId?: string;
  readonly onChange: (
    fieldName: string,
    value: unknown,
    displayRecord?: Record<string, unknown> | null,
  ) => void;
  readonly onCancel: () => void;
  readonly hideActions?: boolean;
  readonly modalActionPlacement?: "inline" | "footer";
  readonly modalFooterLayout?: UiLayoutDocument;
  readonly onFooterChange?: (footer: ReactNode | null) => void;
  readonly isSubmitting?: boolean;
  readonly cancelLabel: string;
  readonly saveLabel: string;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function EntityWizardForm({
  entityName,
  definition,
  mode,
  wizard,
  locale,
  values,
  fieldErrors,
  fieldAccess,
  canRead,
  canWrite,
  recordId,
  onChange,
  onCancel,
  hideActions,
  modalActionPlacement = "inline",
  modalFooterLayout,
  onFooterChange,
  isSubmitting,
  cancelLabel,
  saveLabel,
  onSubmit,
}: EntityWizardFormProps) {
  const { t } = useTranslation("common");
  const { getDefinition } = useEntityCatalog();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [invalidStepIds, setInvalidStepIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [stepFieldErrors, setStepFieldErrors] = useState<
    Record<string, string>
  >({});

  const activeStep = wizard.steps[currentStepIndex];

  const resolvedFieldErrors = useMemo(
    () => mergeFieldErrors(stepFieldErrors, fieldErrors),
    [fieldErrors, stepFieldErrors],
  );

  const formatRequiredMessage = useCallback(
    (fieldName: string) =>
      t("entity.validation.fieldRequired", {
        field: formatFieldLabel(fieldName, definition),
      }),
    [definition, t],
  );

  const buildStepValidationState = useCallback(
    (stepLayout: UiLayoutDocument) => {
      const clientErrors = collectStepFieldErrors({
        stepLayout,
        values,
        definition,
        formatRequiredMessage,
      });
      const mergedErrors = mergeFieldErrors(clientErrors, fieldErrors);
      return {
        clientErrors,
        hasErrors: stepHasValidationErrors(stepLayout, mergedErrors),
      };
    },
    [definition, fieldErrors, formatRequiredMessage, values],
  );

  const isCurrentStepValid = useMemo(() => {
    if (!activeStep) {
      return false;
    }
    return !buildStepValidationState(activeStep.layout).hasErrors;
  }, [activeStep, buildStepValidationState]);

  const handleFieldChange = useCallback(
    (
      fieldName: string,
      value: unknown,
      displayRecord?: Record<string, unknown> | null,
    ) => {
      onChange(fieldName, value, displayRecord);
      setStepFieldErrors((current) => {
        if (!current[fieldName]) {
          return current;
        }
        const next = { ...current };
        delete next[fieldName];
        return next;
      });
    },
    [onChange],
  );

  const stepStatuses = useMemo((): Readonly<
    Record<string, WizardStepStatusKind>
  > => {
    const statuses: Record<string, WizardStepStatusKind> = {};
    for (const [index, step] of wizard.steps.entries()) {
      if (invalidStepIds.has(step.id)) {
        statuses[step.id] = "invalid";
      } else if (index < currentStepIndex) {
        statuses[step.id] = "completed";
      } else if (index === currentStepIndex) {
        statuses[step.id] = "active";
      } else {
        statuses[step.id] = "pending";
      }
    }
    return statuses;
  }, [currentStepIndex, invalidStepIds, wizard.steps]);

  const suppressInlineActions =
    hideActions || modalActionPlacement === "footer";

  const sharedFormContextOptions = useMemo(
    () => ({
      entityName,
      definition,
      locale,
      mode,
      values,
      errors: resolvedFieldErrors,
      fieldAccess,
      canRead,
      canWrite,
      recordId,
      onChange: handleFieldChange,
      onCancel,
      hideActions: true as const,
      isSubmitting,
      cancelLabel,
      saveLabel,
      getDefinition,
    }),
    [
      entityName,
      definition,
      locale,
      mode,
      values,
      resolvedFieldErrors,
      fieldAccess,
      handleFieldChange,
      canRead,
      canWrite,
      recordId,
      onCancel,
      isSubmitting,
      cancelLabel,
      saveLabel,
      getDefinition,
    ],
  );

  const baseContext = useMemo(
    () => createEntityFormRenderContext(sharedFormContextOptions),
    [sharedFormContextOptions],
  );

  const stepFormContext = useMemo(
    () =>
      createEntityFormRenderContext({
        ...sharedFormContextOptions,
        wizardStepContent: true,
      }),
    [sharedFormContextOptions],
  );

  const applyStepValidation = useCallback(
    (stepLayout: UiLayoutDocument, stepId: string) => {
      const { clientErrors, hasErrors } = buildStepValidationState(stepLayout);
      setStepFieldErrors((current) =>
        mergeFieldErrors(
          omitFieldErrorsForStep(current, stepLayout),
          clientErrors,
        ),
      );
      setInvalidStepIds((current) => {
        const next = new Set(current);
        if (hasErrors) {
          next.add(stepId);
        } else {
          next.delete(stepId);
        }
        return next;
      });
      return hasErrors;
    },
    [buildStepValidationState],
  );

  const handleNext = useCallback(() => {
    const step = wizard.steps[currentStepIndex];
    if (!step) {
      return;
    }
    if (applyStepValidation(step.layout, step.id)) {
      return;
    }
    setCurrentStepIndex((index) =>
      Math.min(index + 1, wizard.steps.length - 1),
    );
  }, [applyStepValidation, currentStepIndex, wizard.steps]);

  const submitCurrentStep = useCallback(() => {
    for (const [index, step] of wizard.steps.entries()) {
      if (!layoutHasInputFields(step.layout)) {
        continue;
      }
      if (applyStepValidation(step.layout, step.id)) {
        setCurrentStepIndex(index);
        return;
      }
    }

    const step = wizard.steps[currentStepIndex];
    if (step && applyStepValidation(step.layout, step.id)) {
      return;
    }
    onSubmit({ preventDefault: () => {} } as FormEvent<HTMLFormElement>);
  }, [applyStepValidation, currentStepIndex, onSubmit, wizard.steps]);

  const handleFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitCurrentStep();
    },
    [submitCurrentStep],
  );

  const handleBack = useCallback(() => {
    const targetIndex = Math.max(0, currentStepIndex - 1);
    const targetStep = wizard.steps[targetIndex];
    setCurrentStepIndex(targetIndex);
    if (targetStep) {
      setInvalidStepIds((current) => {
        const next = new Set(current);
        next.delete(targetStep.id);
        return next;
      });
    }
  }, [currentStepIndex, wizard.steps]);

  const wizardState = useMemo(
    () => ({
      steps: wizard.steps.map((step) => ({
        id: step.id,
        label: step.label,
        subtitle: step.subtitle,
        icon: step.icon,
      })),
      currentStepIndex,
      stepStatuses,
    }),
    [currentStepIndex, stepStatuses, wizard.steps],
  );

  const shellLayout = useMemo(
    () =>
      ensureWizardShellLayout(wizard.shellLayout, {
        actionsInModalFooter: modalFooterLayout != null,
      }),
    [modalFooterLayout, wizard.shellLayout],
  );

  const renderContext = useMemo(() => {
    return {
      ...baseContext,
      wizard: wizardState,
      wizardProgressRenderer: (config: WizardProgressComponentConfig) => (
        <WizardProgress config={config} wizard={wizardState} />
      ),
      wizardStepHostRenderer: (config: WizardStepHostComponentConfig) =>
        activeStep ? (
          <WizardStepHost config={config}>
            <RecursiveLayoutRenderer
              layout={activeStep.layout}
              context={stepFormContext}
            />
          </WizardStepHost>
        ) : null,
      wizardActionsRenderer: (config: WizardActionsComponentConfig) => (
        <WizardActions
          config={config}
          mode={mode}
          currentStepIndex={currentStepIndex}
          totalSteps={wizard.steps.length}
          isSubmitting={isSubmitting}
          isCurrentStepValid={isCurrentStepValid}
          hideActions={suppressInlineActions}
          onNext={handleNext}
          onBack={handleBack}
          onCancel={onCancel}
          onSubmit={submitCurrentStep}
        />
      ),
    };
  }, [
    activeStep,
    baseContext,
    currentStepIndex,
    handleBack,
    handleNext,
    isCurrentStepValid,
    isSubmitting,
    mode,
    onCancel,
    stepFormContext,
    submitCurrentStep,
    suppressInlineActions,
    wizard.steps.length,
    wizardState,
  ]);

  const wizardFooterContext = useMemo(
    (): LayoutRenderContext => ({
      ...baseContext,
      wizard: wizardState,
      wizardProgressRenderer: (config: WizardProgressComponentConfig) => (
        <WizardProgress config={config} wizard={wizardState} />
      ),
      wizardActionsRenderer: (config: WizardActionsComponentConfig) => (
        <WizardActions
          config={config}
          mode={mode}
          currentStepIndex={currentStepIndex}
          totalSteps={wizard.steps.length}
          isSubmitting={isSubmitting}
          isCurrentStepValid={isCurrentStepValid}
          hideActions={false}
          onNext={handleNext}
          onBack={handleBack}
          onCancel={onCancel}
          onSubmit={submitCurrentStep}
        />
      ),
    }),
    [
      baseContext,
      currentStepIndex,
      handleBack,
      handleNext,
      isCurrentStepValid,
      isSubmitting,
      mode,
      onCancel,
      submitCurrentStep,
      wizard.steps.length,
      wizardState,
    ],
  );

  useEntityFormModalFooter({
    enabled: modalActionPlacement === "footer",
    onFooterChange,
    modalFooterLayout,
    fallbackLayout: shellLayout,
    footerContext: wizardFooterContext,
    wizardMode: mode,
    wizardCurrentStepIndex: currentStepIndex,
    wizardTotalSteps: wizard.steps.length,
    wizardIsSubmitting: isSubmitting,
    wizardIsCurrentStepValid: isCurrentStepValid,
    wizardOnNext: handleNext,
    wizardOnBack: handleBack,
    wizardOnCancel: onCancel,
    wizardOnSubmit: submitCurrentStep,
  });

  if (!activeStep) {
    return null;
  }

  return (
    <Form
      id={ENTITY_FORM_ID}
      className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-0"
      onSubmit={(event) => void handleFormSubmit(event)}
    >
      <RecursiveLayoutRenderer
        layout={shellLayout}
        context={renderContext}
        stretchRootColumns
      />
    </Form>
  );
}
