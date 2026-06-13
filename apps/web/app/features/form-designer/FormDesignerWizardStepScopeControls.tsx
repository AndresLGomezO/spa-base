import { useCallback, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { IconButton, Select } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useFormDesignerComponentsSession } from "./FormDesignerComponentsSession";
import {
  FormDesignerWizardStepModal,
  type FormDesignerWizardStepModalValues,
} from "./FormDesignerWizardStepModal";
import { useFormDesigner } from "./form-designer-context";

const EMPTY_STEP_MODAL_VALUES: FormDesignerWizardStepModalValues = {
  label: "",
  subtitle: "",
  icon: "",
};

interface FormDesignerWizardStepScopeControlsProps {
  readonly stepIndex: number;
  readonly variant: "expanded" | "collapsed";
}

export function FormDesignerWizardStepScopeControls({
  stepIndex,
  variant,
}: FormDesignerWizardStepScopeControlsProps) {
  const { t } = useTranslation("common");
  const {
    editor,
    markComponentsDirty,
    requestCloseComponentRowPanel,
    componentRowPanelOpen,
  } = useFormDesigner();
  const { setStepIndex } = useFormDesignerComponentsSession();
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [modalValues, setModalValues] =
    useState<FormDesignerWizardStepModalValues>(EMPTY_STEP_MODAL_VALUES);

  const steps = editor.wizard.steps;
  const hasSteps = steps.length > 0;
  const hasSelectedStep =
    hasSteps && stepIndex >= 0 && stepIndex < steps.length;
  const selectedStep = hasSelectedStep ? steps[stepIndex] : undefined;

  const closeModal = useCallback(() => {
    setModalMode(null);
    setModalValues(EMPTY_STEP_MODAL_VALUES);
  }, []);

  const handleOpenAdd = useCallback(() => {
    setModalValues({
      label: `Step ${steps.length + 1}`,
      subtitle: "",
      icon: "",
    });
    setModalMode("add");
  }, [steps.length]);

  const handleOpenEdit = useCallback(() => {
    if (!selectedStep) {
      return;
    }

    setModalValues({
      label: selectedStep.label,
      subtitle: selectedStep.subtitle ?? "",
      icon: selectedStep.icon ?? "",
    });
    setModalMode("edit");
  }, [selectedStep]);

  const handleConfirmModal = useCallback(() => {
    const label = modalValues.label.trim();
    if (!label) {
      return;
    }

    const subtitle = modalValues.subtitle.trim();
    const icon = modalValues.icon.trim();

    if (modalMode === "add") {
      const nextIndex = editor.addStep({
        label,
        ...(subtitle ? { subtitle } : {}),
        ...(icon ? { icon } : {}),
      });
      setStepIndex(nextIndex);
    } else if (modalMode === "edit" && hasSelectedStep) {
      editor.updateStep(stepIndex, {
        label,
        subtitle: subtitle || undefined,
        icon: icon || undefined,
      });
    }

    markComponentsDirty();
    closeModal();
  }, [
    closeModal,
    editor,
    hasSelectedStep,
    markComponentsDirty,
    modalMode,
    modalValues,
    setStepIndex,
    stepIndex,
  ]);

  const handleRemoveStep = useCallback(() => {
    if (!hasSelectedStep) {
      return;
    }

    if (componentRowPanelOpen) {
      requestCloseComponentRowPanel();
    }

    editor.removeStep(stepIndex);
    setStepIndex(Math.max(0, stepIndex - 1));
    markComponentsDirty();
  }, [
    componentRowPanelOpen,
    editor,
    hasSelectedStep,
    markComponentsDirty,
    requestCloseComponentRowPanel,
    setStepIndex,
    stepIndex,
  ]);

  const actionButtons = (
    <>
      <IconButton
        type="button"
        size="sm"
        label={t("formDesigner.components.wizardSteps.add")}
        onClick={handleOpenAdd}
      >
        <Plus aria-hidden className="size-4" />
      </IconButton>
      <IconButton
        type="button"
        size="sm"
        label={t("formDesigner.components.wizardSteps.edit")}
        disabled={!hasSelectedStep}
        onClick={handleOpenEdit}
      >
        <Pencil aria-hidden className="size-4" />
      </IconButton>
      <IconButton
        type="button"
        size="sm"
        label={t("formDesigner.components.wizardSteps.remove")}
        disabled={!hasSelectedStep}
        onClick={handleRemoveStep}
      >
        <Trash2 aria-hidden className="size-4" />
      </IconButton>
    </>
  );

  if (variant === "collapsed") {
    return (
      <>
        {actionButtons}
        <FormDesignerWizardStepModal
          open={modalMode != null}
          mode={modalMode ?? "add"}
          values={modalValues}
          onClose={closeModal}
          onChange={setModalValues}
          onConfirm={handleConfirmModal}
        />
      </>
    );
  }

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {t("formDesigner.components.wizardStepLabel")}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            id="form-designer-wizard-step-select"
            className="border-input bg-background min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm"
            value={hasSelectedStep ? stepIndex : ""}
            disabled={!hasSteps}
            onChange={(event) =>
              setStepIndex(Number.parseInt(event.target.value, 10))
            }
          >
            {!hasSteps ? (
              <option value="">
                {t("formDesigner.components.wizardSteps.emptyDropdown")}
              </option>
            ) : (
              steps.map((step, index) => (
                <option key={step.id} value={index}>
                  {step.label}
                </option>
              ))
            )}
          </Select>
          {actionButtons}
        </div>
      </label>

      <FormDesignerWizardStepModal
        open={modalMode != null}
        mode={modalMode ?? "add"}
        values={modalValues}
        onClose={closeModal}
        onChange={setModalValues}
        onConfirm={handleConfirmModal}
      />
    </>
  );
}
