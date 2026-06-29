import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  FieldLabel,
  Input,
  Modal,
  Select,
  Text,
  toast,
} from "@repo/ui";

import { getEntityLabel } from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useEntityQueryBuilder } from "./entity-query-builder-context";

interface EntityQueryMetadataModalProps {
  readonly mode: "create" | "edit";
  readonly open: boolean;
  readonly queryId?: string;
  readonly onClose: () => void;
}

const selectClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";

const textareaClassName =
  "border-input bg-background flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm";

export function EntityQueryMetadataModal({
  mode,
  open,
  queryId,
  onClose,
}: EntityQueryMetadataModalProps) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const { editor, canCreate, canUpdate } = useEntityQueryBuilder();

  const editingDefinition =
    mode === "edit" && queryId
      ? editor.definitions.find((entry) => entry.id === queryId)
      : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceEntity, setSourceEntity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && editingDefinition) {
      setName(editingDefinition.name);
      setDescription(editingDefinition.description ?? "");
      setSourceEntity(editingDefinition.sourceEntity);
      return;
    }

    setName("");
    setDescription("");
    setSourceEntity(entities[0]?.name ?? "");
  }, [editingDefinition, entities, mode, open]);

  const canSubmit =
    name.trim().length > 0 &&
    (mode === "edit" || sourceEntity.trim().length > 0) &&
    (mode === "create" ? canCreate : canUpdate);

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const result = await editor.createQuery({
          name: name.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          sourceEntity,
        });
        if (typeof result === "string") {
          toast.error(result);
          return;
        }
        toast.success(t("queryBuilder.metadata.created"));
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
      toast.success(t("queryBuilder.metadata.updated"));
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
          ? t("queryBuilder.metadata.createTitle")
          : t("queryBuilder.metadata.editTitle")
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("queryBuilder.cancel")}
          </Button>
          <Button
            type="button"
            loading={isSubmitting}
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {mode === "create"
              ? t("queryBuilder.metadata.createAction")
              : t("queryBuilder.save")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <FieldLabel>{t("queryBuilder.metadata.name")}</FieldLabel>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("queryBuilder.metadata.namePlaceholder")}
          />
        </div>

        <div className="space-y-1">
          <FieldLabel>{t("queryBuilder.metadata.description")}</FieldLabel>
          <textarea
            className={textareaClassName}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("queryBuilder.metadata.descriptionPlaceholder")}
          />
        </div>

        {mode === "create" ? (
          <div className="space-y-1">
            <FieldLabel>{t("queryBuilder.metadata.sourceEntity")}</FieldLabel>
            <Select
              className={selectClassName}
              value={sourceEntity}
              onChange={(event) => setSourceEntity(event.target.value)}
            >
              <option value="">{t("queryBuilder.selectEntity")}</option>
              {entities.map((entity) => (
                <option key={entity.name} value={entity.name}>
                  {getEntityLabel(entity)}
                </option>
              ))}
            </Select>
          </div>
        ) : editingDefinition ? (
          <div className="space-y-1">
            <Text className="text-muted-foreground text-xs">
              {t("queryBuilder.metadata.sourceEntity")}
            </Text>
            <Text className="text-sm">
              {entities.find(
                (entry) => entry.name === editingDefinition.sourceEntity,
              )
                ? getEntityLabel(
                    entities.find(
                      (entry) => entry.name === editingDefinition.sourceEntity,
                    )!,
                  )
                : editingDefinition.sourceEntity}
            </Text>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
