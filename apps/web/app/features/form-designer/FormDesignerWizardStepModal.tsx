import { Button, FieldLabel, Input, Modal } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { LucideIconField } from "../../components/shared/LucideIconField";

export interface FormDesignerWizardStepModalValues {
  readonly label: string;
  readonly subtitle: string;
  readonly icon: string;
}

interface FormDesignerWizardStepModalProps {
  readonly open: boolean;
  readonly mode: "add" | "edit";
  readonly values: FormDesignerWizardStepModalValues;
  readonly onClose: () => void;
  readonly onChange: (values: FormDesignerWizardStepModalValues) => void;
  readonly onConfirm: () => void;
}

export function FormDesignerWizardStepModal({
  open,
  mode,
  values,
  onClose,
  onChange,
  onConfirm,
}: FormDesignerWizardStepModalProps) {
  const { t } = useTranslation("common");
  const canConfirm = values.label.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        mode === "add"
          ? t("formDesigner.components.wizardSteps.addModalTitle")
          : t("formDesigner.components.wizardSteps.editModalTitle")
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <FieldLabel htmlFor="form-designer-wizard-step-label">
            {t("formDesigner.components.wizardSteps.titleLabel")}
          </FieldLabel>
          <Input
            id="form-designer-wizard-step-label"
            value={values.label}
            onChange={(event) =>
              onChange({ ...values, label: event.target.value })
            }
          />
        </div>

        <div>
          <FieldLabel htmlFor="form-designer-wizard-step-subtitle">
            {t("formDesigner.components.wizardSteps.subtitleLabel")}
          </FieldLabel>
          <Input
            id="form-designer-wizard-step-subtitle"
            value={values.subtitle}
            onChange={(event) =>
              onChange({ ...values, subtitle: event.target.value })
            }
          />
        </div>

        <LucideIconField
          id="form-designer-wizard-step-icon"
          label={t("formDesigner.components.wizardSteps.iconLabel")}
          hint={t("entityCategories.iconHint")}
          value={values.icon}
          onChange={(icon) => onChange({ ...values, icon })}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("formDesigner.components.modalCancel")}
          </Button>
          <Button type="button" disabled={!canConfirm} onClick={onConfirm}>
            {mode === "add"
              ? t("formDesigner.components.wizardSteps.add")
              : t("formDesigner.components.wizardSteps.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
