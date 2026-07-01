import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, FieldLabel, Input, Modal, Select, toast } from "@repo/ui";
import type { DataHookOperation } from "@repo/hooks";
import { DATA_HOOK_OPERATIONS } from "@repo/hooks";

import { useDataHooks } from "./data-hooks-context";

interface DataHookMetadataModalProps {
  readonly mode: "create" | "edit";
  readonly open: boolean;
  readonly hookId?: string;
  readonly onClose: () => void;
}

const controlClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";
const textareaClassName =
  "border-input bg-background flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm";

export function DataHookMetadataModal({
  mode,
  open,
  hookId,
  onClose,
}: DataHookMetadataModalProps) {
  const { t } = useTranslation("common");
  const { editor, canCreate, canUpdate } = useDataHooks();

  const editingDefinition =
    mode === "edit" && hookId
      ? editor.definitions.find((entry) => entry.id === hookId)
      : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [operation, setOperation] = useState<DataHookOperation>("create");
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
    setOperation("create");
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
        const result = await editor.createHook({
          name: name.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          operation,
        });
        if (typeof result === "string") {
          toast.error(result);
          return;
        }
        toast.success(t("dataHooks.metadata.created"));
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
      toast.success(t("dataHooks.metadata.updated"));
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
          ? t("dataHooks.metadata.createTitle")
          : t("dataHooks.metadata.editTitle")
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("dataHooks.cancel")}
          </Button>
          <Button
            type="button"
            loading={isSubmitting}
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {mode === "create"
              ? t("dataHooks.metadata.createAction")
              : t("dataHooks.settings.save")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <FieldLabel>{t("dataHooks.metadata.name")}</FieldLabel>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("dataHooks.metadata.namePlaceholder")}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>{t("dataHooks.metadata.description")}</FieldLabel>
          <textarea
            className={textareaClassName}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        {mode === "create" ? (
          <div className="space-y-1">
            <FieldLabel>{t("dataHooks.metadata.trigger")}</FieldLabel>
            <Select
              className={controlClassName}
              value={operation}
              onChange={(event) =>
                setOperation(event.target.value as DataHookOperation)
              }
            >
              {DATA_HOOK_OPERATIONS.map((op) => (
                <option key={op} value={op}>
                  {t(`dataHooks.operation.${op}`)}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
