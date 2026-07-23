import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, FieldLabel, Input, Modal, Text, toast } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";

import { RelationPicker } from "../../components/entity/RelationPicker";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { getEntityLabel } from "../../entities/entity-catalog";
import { bindingDisplayName } from "./email-matching-draft";
import { useEmailMatching } from "./email-matching-context";

interface EmailMatchingMetadataModalProps {
  readonly mode: "create" | "edit";
  readonly open: boolean;
  readonly bindingId?: string;
  readonly onClose: () => void;
}

const controlClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";
const textareaClassName =
  "border-input bg-background flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm";

export function EmailMatchingMetadataModal({
  mode,
  open,
  bindingId,
  onClose,
}: EmailMatchingMetadataModalProps) {
  const { t } = useTranslation("common");
  const { editor, canCreate, canUpdate } = useEmailMatching();
  const { items: catalog } = useEntityCatalog();

  const editingBinding =
    mode === "edit" && bindingId
      ? editor.bindings.find((entry) => entry.id === bindingId)
      : null;

  const emailMatchingEntities = useMemo(
    () =>
      catalog
        .filter((entry) => entry.emailMatchingEnabled === true)
        .slice()
        .sort((left, right) =>
          getEntityLabel(left).localeCompare(getEntityLabel(right)),
        ),
    [catalog],
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entityName, setEntityName] = useState("");
  const [recordId, setRecordId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === "edit" && editingBinding) {
      setName(editingBinding.name ?? "");
      setDescription(editingBinding.description ?? "");
      setEntityName(editingBinding.entityName);
      setRecordId(editingBinding.recordId);
      return;
    }
    setName("");
    setDescription("");
    setEntityName(emailMatchingEntities[0]?.name ?? "");
    setRecordId("");
  }, [editingBinding, emailMatchingEntities, mode, open]);

  const canSubmit =
    name.trim().length > 0 &&
    (mode === "create"
      ? canCreate && entityName.trim().length > 0 && recordId.trim().length > 0
      : canUpdate);

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const result = await editor.createBinding({
          name: name.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          entityName: entityName.trim(),
          recordId: recordId.trim(),
        });
        if (typeof result === "string") {
          toast.error(result);
          return;
        }
        toast.success(t("emailMatchingWorkbench.metadata.created"));
        onClose();
        return;
      }

      if (!editingBinding) {
        return;
      }
      const error = await editor.updateMetadata(editingBinding.id, {
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(t("emailMatchingWorkbench.metadata.updated"));
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
          ? t("emailMatchingWorkbench.metadata.createTitle")
          : t("emailMatchingWorkbench.metadata.editTitle")
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("emailMatchingWorkbench.cancel")}
          </Button>
          <Button
            type="button"
            loading={isSubmitting}
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {mode === "create"
              ? t("emailMatchingWorkbench.metadata.createAction")
              : t("emailMatchingWorkbench.metadata.saveAction")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <FieldLabel htmlFor="email-matching-metadata-name">
            {t("emailMatchingWorkbench.fields.name")}
          </FieldLabel>
          <Input
            id="email-matching-metadata-name"
            className={controlClassName}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor="email-matching-metadata-description">
            {t("emailMatchingWorkbench.fields.description")}
          </FieldLabel>
          <textarea
            id="email-matching-metadata-description"
            className={textareaClassName}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        {mode === "create" ? (
          <>
            <div className="space-y-1">
              <FieldLabel htmlFor="email-matching-metadata-entity">
                {t("emailMatchingWorkbench.fields.entity")}
              </FieldLabel>
              {emailMatchingEntities.length === 0 ? (
                <Text className="text-muted-foreground text-sm">
                  {t("emailMatchingWorkbench.metadata.noEntities")}
                </Text>
              ) : (
                <Select
                  id="email-matching-metadata-entity"
                  className={controlClassName}
                  value={entityName}
                  onChange={(event) => {
                    setEntityName(event.target.value);
                    setRecordId("");
                  }}
                >
                  {emailMatchingEntities.map((entity) => (
                    <option key={entity.name} value={entity.name}>
                      {getEntityLabel(entity)}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            {entityName ? (
              <RelationPicker
                entityName={entityName}
                fieldName="recordId"
                targetEntity={entityName}
                value={recordId || null}
                label={t("emailMatchingWorkbench.fields.record")}
                required
                onChange={(_field, value) =>
                  setRecordId(typeof value === "string" ? value : "")
                }
              />
            ) : null}
          </>
        ) : editingBinding ? (
          <Text className="text-muted-foreground text-sm">
            {t("emailMatchingWorkbench.metadata.targetSummary", {
              entity: editingBinding.entityName,
              name: bindingDisplayName(editingBinding),
            })}
          </Text>
        ) : null}
      </div>
    </Modal>
  );
}
