import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import {
  Alert,
  Button,
  FieldLabel,
  Form,
  Heading,
  Input,
  Text,
} from "@repo/ui";

import {
  createEntityDefinition,
  isApiClientError,
  type FieldDefinitionInput,
} from "../../lib/api-client";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { getEntityLabel } from "../../entities/entity-catalog";
import { FieldEditor } from "./FieldEditor";
import { ModelReview } from "./ModelReview";

interface EntityDefinitionWizardProps {
  readonly tenantId?: string;
  readonly onCreated: () => void;
  readonly onCancel: () => void;
}

const EMPTY_FIELD: FieldDefinitionInput = {
  name: "",
  type: "string",
  required: false,
};

export function EntityDefinitionWizard({
  tenantId,
  onCreated,
  onCancel,
}: EntityDefinitionWizardProps) {
  const { t } = useTranslation("common");
  const { items, refresh } = useEntityCatalog();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [fields, setFields] = useState<FieldDefinitionInput[]>([
    { ...EMPTY_FIELD },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const relationTargets = useMemo(
    () =>
      items.map((item) => ({
        name: item.name,
        label: getEntityLabel(item),
      })),
    [items],
  );

  function updateField(index: number, field: FieldDefinitionInput) {
    setFields((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? field : entry,
      ),
    );
  }

  function handleNext(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (step === 1) {
      if (!name.trim() || !label.trim()) {
        setError(t("dataModels.validation.basicRequired"));
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      const validFields = fields.filter((field) => field.name.trim());
      if (validFields.length === 0) {
        setError(t("dataModels.validation.fieldsRequired"));
        return;
      }
      setStep(3);
      return;
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        label: label.trim(),
        fields: fields
          .filter((field) => field.name.trim())
          .map((field) => ({
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
        ...(tenantId ? { tenantId } : {}),
      };

      await createEntityDefinition(payload);
      await refresh();
      onCreated();
    } catch (submitError) {
      if (isApiClientError(submitError)) {
        setError(submitError.message);
      } else {
        setError(
          submitError instanceof Error
            ? submitError.message
            : t("dataModels.createFailed"),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Heading level={2}>{t("dataModels.wizardTitle")}</Heading>
        <Text>{t("dataModels.stepIndicator", { step, total: 3 })}</Text>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      {step === 1 ? (
        <Form onSubmit={handleNext} className="space-y-4">
          <div>
            <FieldLabel htmlFor="model-name">
              {t("dataModels.modelName")}
            </FieldLabel>
            <Input
              id="model-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="loan"
            />
            <Text className="text-muted-foreground mt-1 text-sm">
              {t("dataModels.modelNameHint")}
            </Text>
          </div>
          <div>
            <FieldLabel htmlFor="model-label">
              {t("dataModels.modelLabel")}
            </FieldLabel>
            <Input
              id="model-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Loans"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t("entity.cancel")}
            </Button>
            <Button type="submit">{t("dataModels.next")}</Button>
          </div>
        </Form>
      ) : null}

      {step === 2 ? (
        <Form onSubmit={handleNext} className="space-y-4">
          {fields.map((field, index) => (
            <FieldEditor
              key={index}
              field={field}
              index={index}
              relationTargets={relationTargets}
              onChange={updateField}
              onRemove={(removeIndex) =>
                setFields((current) =>
                  current.filter((_, entryIndex) => entryIndex !== removeIndex),
                )
              }
              canRemove={fields.length > 1}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFields((current) => [...current, { ...EMPTY_FIELD }])
            }
          >
            {t("dataModels.addField")}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              {t("dataModels.back")}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t("entity.cancel")}
            </Button>
            <Button type="submit">{t("dataModels.next")}</Button>
          </div>
        </Form>
      ) : null}

      {step === 3 ? (
        <Form onSubmit={handleSubmit} className="space-y-4">
          <ModelReview
            name={name.trim()}
            label={label.trim()}
            fields={fields}
          />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(2)}>
              {t("dataModels.back")}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t("entity.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("loading") : t("dataModels.createModel")}
            </Button>
          </div>
        </Form>
      ) : null}
    </div>
  );
}
