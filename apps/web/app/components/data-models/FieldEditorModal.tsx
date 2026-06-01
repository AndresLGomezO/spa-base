import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Text } from "@repo/ui";

import type { FieldDefinitionInput } from "../../lib/api-client";
import { FormModal } from "../forms/FormModal";

import { createEmptyField, resolveFieldDefinitionName } from "./field-types";
import { FieldEditorForm } from "./FieldEditorForm";
import { FieldTypePicker } from "./FieldTypePicker";

interface FieldEditorModalProps {
  readonly open: boolean;
  readonly mode: "add" | "edit";
  readonly field: FieldDefinitionInput;
  readonly entityName?: string;
  readonly orderDefault: number;
  readonly relationTargets: readonly {
    readonly name: string;
    readonly label: string;
  }[];
  readonly canRemove: boolean;
  readonly onSave: (field: FieldDefinitionInput) => void;
  readonly onRemove?: () => void;
  readonly onClose: () => void;
}

export function FieldEditorModal({
  open,
  mode,
  field,
  entityName,
  orderDefault,
  relationTargets,
  canRemove,
  onSave,
  onRemove,
  onClose,
}: FieldEditorModalProps) {
  const { t } = useTranslation("common");
  const [step, setStep] = useState<"type" | "details">(
    mode === "add" ? "type" : "details",
  );
  const [draft, setDraft] = useState(field);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(field);
    setStep(mode === "add" ? "type" : "details");
    // Sync when the modal opens or when editing a different field, not on every
    // parent re-render that passes a new object reference for the same field.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- field identity via name
  }, [open, mode, field.name]);

  function handleClose() {
    onClose();
  }

  function handleSelectType(type: FieldDefinitionInput["type"]) {
    setDraft(createEmptyField(type, orderDefault));
    setStep("details");
  }

  function handleSave() {
    const resolvedName = resolveFieldDefinitionName(draft);
    if (!resolvedName) {
      return;
    }
    onSave({
      ...draft,
      name: resolvedName,
      ...(draft.type === "enum"
        ? {
            enumValues: (draft.enumValues ?? [])
              .map((value) => value.trim())
              .filter(Boolean),
          }
        : {}),
    });
    handleClose();
  }

  const title =
    mode === "add"
      ? t("dataModels.addFieldTitle")
      : t("dataModels.editFieldTitle");

  const isTypeStep = mode === "add" && step === "type";

  const footer = isTypeStep ? (
    <Button type="button" variant="ghost" onClick={handleClose}>
      {t("entity.cancel")}
    </Button>
  ) : (
    <div className="flex w-full items-center justify-between gap-2">
      <div>
        {mode === "edit" && canRemove && onRemove ? (
          <Button type="button" variant="ghost" onClick={onRemove}>
            {t("dataModels.removeField")}
          </Button>
        ) : null}
        {mode === "add" ? (
          <Button type="button" variant="ghost" onClick={() => setStep("type")}>
            {t("dataModels.back")}
          </Button>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={handleClose}>
          {t("entity.cancel")}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!resolveFieldDefinitionName(draft)}
        >
          {t("entity.save")}
        </Button>
      </div>
    </div>
  );

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      title={title}
      size="lg"
      scrollable
      layer="nested"
      closeLabel={t("entity.cancel")}
      footer={footer}
    >
      {isTypeStep ? (
        <div className="space-y-4">
          <Text className="text-sm font-medium">
            {t("dataModels.fieldTypeStep")}
          </Text>
          <FieldTypePicker onSelect={handleSelectType} />
        </div>
      ) : (
        <div className="space-y-4">
          {mode === "add" ? (
            <Text className="text-sm font-medium">
              {t("dataModels.fieldDetailsStep")}
            </Text>
          ) : null}
          <FieldEditorForm
            field={draft}
            entityName={entityName}
            relationTargets={relationTargets}
            onChange={setDraft}
            typeReadOnly={mode === "edit"}
            orderDefault={orderDefault}
          />
        </div>
      )}
    </FormModal>
  );
}
