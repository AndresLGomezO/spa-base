import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

import {
  Alert,
  Button,
  Checkbox,
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
import { EntityFieldsManager } from "./EntityFieldsManager";

const ENTITY_DEFINITION_EDITOR_FORM_ID = "entity-definition-editor-form";

interface EntityDefinitionEditorProps {
  readonly definitionId: string;
  readonly tenantId: string;
  readonly canUpdate?: boolean;
  readonly onSaved: (record: EntityDefinitionRecord) => void;
  readonly onCancel: () => void;
  readonly onFooterChange?: (footer: ReactNode | null) => void;
}

export function EntityDefinitionEditor({
  definitionId,
  tenantId,
  canUpdate = true,
  onSaved,
  onCancel,
  onFooterChange,
}: EntityDefinitionEditorProps) {
  const { t } = useTranslation("common");
  const { items, refresh } = useEntityCatalog();
  const [record, setRecord] = useState<EntityDefinitionRecord | null>(null);
  const [label, setLabel] = useState("");
  const [fields, setFields] = useState<FieldDefinitionInput[]>([]);
  const [tenantWideRead, setTenantWideRead] = useState(false);
  const [displayField, setDisplayField] = useState<string>("");
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
        setTenantWideRead(loaded.tenantWideRead ?? false);
        setDisplayField(loaded.displayField ?? "");
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

  const useModalFooter = Boolean(onFooterChange);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!onFooterChange) {
      return;
    }

    onFooterChange(
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onCancelRef.current()}
        >
          {t("entity.cancel")}
        </Button>
        {canUpdate && record && !isLoading ? (
          <Button
            type="submit"
            form={ENTITY_DEFINITION_EDITOR_FORM_ID}
            disabled={isSubmitting}
          >
            {isSubmitting ? t("loading") : t("dataModels.saveModel")}
          </Button>
        ) : null}
      </div>,
    );
  }, [canUpdate, isLoading, isSubmitting, onFooterChange, record, t]);

  useEffect(() => {
    return () => {
      onFooterChange?.(null);
    };
  }, [onFooterChange]);

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
        tenantWideRead,
        ...(displayField ? { displayField } : {}),
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

      <Form
        id={ENTITY_DEFINITION_EDITOR_FORM_ID}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
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

        <div className="space-y-2">
          <Checkbox
            id="edit-tenant-wide-read"
            label={t("dataModels.tenantWideRead")}
            checked={tenantWideRead}
            disabled={!canUpdate}
            onChange={(event) => setTenantWideRead(event.target.checked)}
          />
          <Text className="text-muted-foreground text-sm">
            {t("dataModels.tenantWideReadHint")}
          </Text>
        </div>

        {fields.some((f) => f.type === "string") ? (
          <div>
            <FieldLabel htmlFor="edit-display-field">
              {t("dataModels.displayField", {
                defaultValue: "Display Field",
              })}
            </FieldLabel>
            <select
              id="edit-display-field"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              value={displayField}
              disabled={!canUpdate}
              onChange={(event) => setDisplayField(event.target.value)}
            >
              <option value="">
                {t("dataModels.displayFieldAuto", {
                  defaultValue: "Auto (name → title → label → id)",
                })}
              </option>
              {fields
                .filter((f) => f.type === "string" && f.name.trim())
                .map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
            </select>
            <Text className="text-muted-foreground mt-1 text-sm">
              {t("dataModels.displayFieldHint", {
                defaultValue:
                  "Which field is shown when this entity is referenced by others.",
              })}
            </Text>
          </div>
        ) : null}

        <EntityFieldsManager
          fields={fields}
          onChange={setFields}
          canEdit={canUpdate}
          relationTargets={relationTargets}
        />

        {!useModalFooter ? (
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
        ) : null}
      </Form>
    </div>
  );
}
