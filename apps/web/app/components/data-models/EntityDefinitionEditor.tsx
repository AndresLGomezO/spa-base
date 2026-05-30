import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import {
  Alert,
  Button,
  FieldLabel,
  Form,
  Heading,
  Input,
  Text,
  toast,
} from "@repo/ui";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { getEntityLabel } from "../../entities/entity-catalog";
import {
  getEntityDefinition,
  isApiClientError,
  patchEntityDefinition,
  type EntityDefinitionRecord,
  type FieldDefinitionInput,
} from "../../lib/api-client";
import { EntityFormSkeleton } from "../loading/EntityFormSkeleton";
import { FieldEditor } from "./FieldEditor";

interface EntityDefinitionEditorProps {
  readonly definitionId: string;
  readonly tenantId: string;
  readonly canUpdate?: boolean;
  readonly onSaved: (record: EntityDefinitionRecord) => void;
  readonly onCancel: () => void;
}

export function EntityDefinitionEditor({
  definitionId,
  tenantId,
  canUpdate = true,
  onSaved,
  onCancel,
}: EntityDefinitionEditorProps) {
  const { t } = useTranslation("common");
  const { items, refresh } = useEntityCatalog();
  const [record, setRecord] = useState<EntityDefinitionRecord | null>(null);
  const [label, setLabel] = useState("");
  const [fields, setFields] = useState<FieldDefinitionInput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const relationTargets = useMemo(
    () =>
      items.map((item) => ({
        name: item.name,
        label: getEntityLabel(item),
      })),
    [items],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDefinition() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const loaded = await getEntityDefinition(definitionId);
        if (cancelled) {
          return;
        }
        setRecord(loaded);
        setLabel(loaded.label);
        setFields([...loaded.fields]);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setLoadError(
          loadError instanceof Error
            ? loadError.message
            : t("dataModels.loadFailed"),
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDefinition();

    return () => {
      cancelled = true;
    };
  }, [definitionId, t, tenantId]);

  function updateField(index: number, field: FieldDefinitionInput) {
    setFields((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? field : entry,
      ),
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canUpdate || !record) {
      return;
    }

    setValidationError(null);

    const validFields = fields.filter((field) => field.name.trim());
    if (validFields.length === 0) {
      setValidationError(t("dataModels.validation.fieldsRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      const updated = await patchEntityDefinition(definitionId, {
        label: label.trim(),
        fields: validFields.map((field) => ({
          ...field,
          name: field.name.trim(),
          ...(field.type === "enum"
            ? {
                enumValues: (field.enumValues ?? [])
                  .map((value) => value.trim())
                  .filter(Boolean),
              }
            : {}),
        })),
      });
      await refresh();
      onSaved(updated);
    } catch (submitError) {
      if (isApiClientError(submitError)) {
        toast.error(submitError.message);
      } else {
        toast.error(
          submitError instanceof Error
            ? submitError.message
            : t("dataModels.updateFailed"),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <EntityFormSkeleton />;
  }

  if (!record) {
    return loadError ? <Alert>{loadError}</Alert> : null;
  }

  return (
    <div className="space-y-4">
      <Heading level={2}>
        {t("dataModels.editTitle", { name: record.name })}
      </Heading>

      {validationError ? <Alert>{validationError}</Alert> : null}

      <Form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="edit-model-name">
            {t("dataModels.modelName")}
          </FieldLabel>
          <Input id="edit-model-name" value={record.name} disabled readOnly />
          <Text className="text-muted-foreground mt-1 text-sm">
            {t("dataModels.nameReadOnly")}
          </Text>
        </div>

        <div>
          <FieldLabel htmlFor="edit-model-label">
            {t("dataModels.modelLabel")}
          </FieldLabel>
          <Input
            id="edit-model-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            disabled={!canUpdate}
          />
        </div>

        <div className="space-y-4">
          <Heading level={3}>{t("dataModels.fieldsTitle")}</Heading>
          {fields.map((field, index) => (
            <FieldEditor
              key={`${field.name}-${index}`}
              field={field}
              index={index}
              relationTargets={relationTargets}
              onChange={updateField}
              onRemove={(removeIndex) =>
                setFields((current) =>
                  current.filter((_, entryIndex) => entryIndex !== removeIndex),
                )
              }
              canRemove={fields.length > 1 && canUpdate}
            />
          ))}
          {canUpdate ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFields((current) => [
                  ...current,
                  { name: "", type: "string", required: false },
                ])
              }
            >
              {t("dataModels.addField")}
            </Button>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("entity.cancel")}
          </Button>
          {canUpdate ? (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("loading") : t("dataModels.saveModel")}
            </Button>
          ) : null}
        </div>
      </Form>
    </div>
  );
}
