import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, FieldLabel, Input, Modal, Text, toast } from "@repo/ui";

import { useFormulas } from "./formulas-context";

interface FormulaMetadataModalProps {
  readonly mode: "create" | "edit";
  readonly open: boolean;
  readonly formulaId?: string;
  readonly onClose: () => void;
}

const controlClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";
const textareaClassName =
  "border-input bg-background flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm";

export function FormulaMetadataModal({
  mode,
  open,
  formulaId,
  onClose,
}: FormulaMetadataModalProps) {
  const { t } = useTranslation("common");
  const { editor, canCreate, canUpdate } = useFormulas();

  const editingDefinition =
    mode === "edit" && formulaId
      ? editor.definitions.find((entry) => entry.id === formulaId)
      : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === "edit" && editingDefinition) {
      setName(editingDefinition.name);
      setDescription(editingDefinition.description ?? "");
      return;
    }
    setName("");
    setDescription("");
  }, [editingDefinition, mode, open]);

  const canSubmit =
    name.trim().length > 0 && (mode === "create" ? canCreate : canUpdate);

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const result = await editor.createFormula({
          name: name.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
        });
        if (typeof result === "string") {
          toast.error(result);
          return;
        }
        toast.success(t("formulas.metadata.created"));
        onClose();
        return;
      }

      if (!editingDefinition) {
        return;
      }
      const error = await editor.updateMetadata(editingDefinition.id, {
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(t("formulas.metadata.updated"));
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        mode === "create"
          ? t("formulas.metadata.createTitle")
          : t("formulas.metadata.editTitle")
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("formulas.cancel")}
          </Button>
          <Button
            type="button"
            loading={isSubmitting}
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {mode === "create"
              ? t("formulas.metadata.createAction")
              : t("formulas.metadata.saveAction")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <FieldLabel htmlFor="formula-metadata-name">
            {t("formulas.fields.name")}
          </FieldLabel>
          <Input
            id="formula-metadata-name"
            className={controlClassName}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor="formula-metadata-description">
            {t("formulas.fields.description")}
          </FieldLabel>
          <textarea
            id="formula-metadata-description"
            className={textareaClassName}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        {mode === "edit" && editingDefinition?.source === "platform" ? (
          <Text className="text-muted-foreground text-sm">
            {t("formulas.metadata.platformReadOnly")}
          </Text>
        ) : null}
      </div>
    </Modal>
  );
}
