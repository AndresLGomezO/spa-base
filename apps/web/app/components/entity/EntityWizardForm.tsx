import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  collectLayoutFieldPaths,
  type WizardActionsComponentConfig,
  type WizardProgressComponentConfig,
  type WizardStepHostComponentConfig,
  type WizardStepStatusKind,
} from "@repo/ui-builder-core";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import type {
  FieldAccessLevel,
  SerializableEntityDefinition,
  WizardFormConfig,
} from "@repo/entities";
import { Form } from "@repo/ui";

import type { EntityName } from "../../entities/entity-catalog";
import { createEntityFormRenderContext } from "../../features/ui-builder/create-entity-form-render-context";
import { WizardActions } from "../forms/WizardActions";
import { WizardProgress } from "../forms/WizardProgress";
import { WizardStepHost } from "../forms/WizardStepHost";
import { ENTITY_FORM_ID } from "./entity-form-constants";

function fieldPathRoot(fieldPath: string): string {
  return fieldPath.includes(".")
    ? (fieldPath.split(".")[0] ?? fieldPath)
    : fieldPath;
}

function validateStepFields(options: {
  readonly stepLayout: import("@repo/ui-builder-core").UiLayoutDocument;
  readonly values: Record<string, unknown>;
  readonly definition: SerializableEntityDefinition;
  readonly fieldErrors: Readonly<Record<string, string | undefined>>;
}): boolean {
  const paths = collectLayoutFieldPaths(options.stepLayout);
  for (const path of paths) {
    const root = fieldPathRoot(path);
    if (options.fieldErrors[root]) {
      return false;
    }
    const field = options.definition.fields[root];
    if (!field?.required) {
      continue;
    }
    const value = options.values[root];
    if (value === "" || value === null || value === undefined) {
      return false;
    }
  }
  return true;
}

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
  readonly onChange: (fieldName: string, value: unknown) => void;
  readonly onCancel: () => void;
  readonly hideActions?: boolean;
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
  isSubmitting,
  cancelLabel,
  saveLabel,
  onSubmit,
}: EntityWizardFormProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [invalidStepIds, setInvalidStepIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const activeStep = wizard.steps[currentStepIndex];

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

  const baseContext = useMemo(
    () =>
      createEntityFormRenderContext({
        entityName,
        definition,
        locale,
        mode,
        values,
        errors: fieldErrors,
        fieldAccess,
        canRead,
        canWrite,
        recordId,
        onChange,
        onCancel,
        hideActions: true,
        isSubmitting,
        cancelLabel,
        saveLabel,
      }),
    [
      entityName,
      definition,
      locale,
      mode,
      values,
      fieldErrors,
      fieldAccess,
      canRead,
      canWrite,
      recordId,
      onChange,
      onCancel,
      isSubmitting,
      cancelLabel,
      saveLabel,
    ],
  );

  const handleNext = useCallback(() => {
    const step = wizard.steps[currentStepIndex];
    if (!step) {
      return;
    }
    const valid = validateStepFields({
      stepLayout: step.layout,
      values,
      definition,
      fieldErrors,
    });
    if (!valid) {
      setInvalidStepIds((current) => new Set(current).add(step.id));
      return;
    }
    setInvalidStepIds((current) => {
      const next = new Set(current);
      next.delete(step.id);
      return next;
    });
    setCurrentStepIndex((index) =>
      Math.min(index + 1, wizard.steps.length - 1),
    );
  }, [currentStepIndex, definition, fieldErrors, values, wizard.steps]);

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

  const renderContext = useMemo(() => {
    const wizardState = {
      steps: wizard.steps.map((step) => ({
        id: step.id,
        label: step.label,
        subtitle: step.subtitle,
        icon: step.icon,
      })),
      currentStepIndex,
      stepStatuses,
    };

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
              context={baseContext}
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
          hideActions={hideActions}
          onNext={handleNext}
          onBack={handleBack}
          onCancel={onCancel}
        />
      ),
    };
  }, [
    activeStep,
    baseContext,
    currentStepIndex,
    handleBack,
    handleNext,
    hideActions,
    isSubmitting,
    mode,
    onCancel,
    stepStatuses,
    wizard.steps,
  ]);

  if (!activeStep) {
    return null;
  }

  return (
    <Form
      id={ENTITY_FORM_ID}
      className="px-1"
      onSubmit={(event) => void onSubmit(event)}
    >
      <RecursiveLayoutRenderer
        layout={wizard.shellLayout}
        context={renderContext}
      />
    </Form>
  );
}
