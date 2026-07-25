import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, FieldLabel, Input, Modal, toast } from "@repo/ui";

import { useUserAiContext } from "./user-ai-context-context";

interface UserAiContextMetadataModalProps {
  readonly mode: "create" | "edit";
  readonly open: boolean;
  readonly sectionId?: string;
  readonly onClose: () => void;
}

const controlClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";
const textareaClassName =
  "border-input bg-background flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm";

export function UserAiContextMetadataModal({
  mode,
  open,
  sectionId,
  onClose,
}: UserAiContextMetadataModalProps) {
  const { t } = useTranslation("common");
  const { editor, canCreate, canUpdate } = useUserAiContext();

  const editing =
    mode === "edit" && sectionId
      ? editor.definitions.find((entry) => entry.id === sectionId)
      : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      return;
    }
    setName("");
    setDescription("");
  }, [editing, mode, open]);

  const canSubmit =
    name.trim().length > 0 && (mode === "create" ? canCreate : canUpdate);

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const result = await editor.createSection({
          name: name.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
        });
        if (typeof result === "string") {
          toast.error(result);
          return;
        }
        toast.success(t("userAiContext.metadata.created"));
        onClose();
        return;
      }
      if (!editing) return;
      const error = await editor.updateMetadata(editing.id, {
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(t("userAiContext.metadata.updated"));
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
          ? t("userAiContext.metadata.createTitle")
          : t("userAiContext.metadata.editTitle")
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("userAiContext.cancel")}
          </Button>
          <Button
            type="button"
            loading={isSubmitting}
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {mode === "create"
              ? t("userAiContext.metadata.create")
              : t("userAiContext.metadata.save")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <FieldLabel htmlFor="uai-meta-name">
            {t("userAiContext.fields.name")}
          </FieldLabel>
          <Input
            id="uai-meta-name"
            className={controlClassName}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor="uai-meta-description">
            {t("userAiContext.fields.description")}
          </FieldLabel>
          <textarea
            id="uai-meta-description"
            className={textareaClassName}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
