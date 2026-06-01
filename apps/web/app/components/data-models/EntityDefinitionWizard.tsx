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

import {
  createEntityDefinition,
  isApiClientError,
  type FieldDefinitionInput,
} from "../../lib/api-client";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { getEntityLabel } from "../../entities/entity-catalog";
import { EntityFieldsManager } from "./EntityFieldsManager";
import { ModelReview } from "./ModelReview";

const ENTITY_DEFINITION_WIZARD_FORM_ID = "entity-definition-wizard-form";

interface EntityDefinitionWizardProps {
  readonly onCreated: () => void;
  readonly onCancel: () => void;
  readonly onFooterChange?: (footer: ReactNode | null) => void;
}

export function EntityDefinitionWizard({
  onCreated,
  onCancel,
  onFooterChange,
}: EntityDefinitionWizardProps) {
  const { t } = useTranslation("common");
  const { items, refresh } = useEntityCatalog();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [fields, setFields] = useState<FieldDefinitionInput[]>([]);
  const [tenantWideRead, setTenantWideRead] = useState(false);
  const [displayField, setDisplayField] = useState<string>("");
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

  const useModalFooter = Boolean(onFooterChange);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!onFooterChange) {
      return;
    }

    onFooterChange(
      <div className="flex w-full items-center justify-between gap-2">
        <div>
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((current) => current - 1)}
            >
              {t("dataModels.back")}
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onCancelRef.current()}
          >
            {t("entity.cancel")}
          </Button>
          {step < 3 ? (
            <Button type="submit" form={ENTITY_DEFINITION_WIZARD_FORM_ID}>
              {t("dataModels.next")}
            </Button>
          ) : (
            <Button
              type="submit"
              form={ENTITY_DEFINITION_WIZARD_FORM_ID}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("loading") : t("dataModels.createModel")}
            </Button>
          )}
        </div>
      </div>,
    );
  }, [isSubmitting, onFooterChange, step, t]);

  useEffect(() => {
    return () => {
      onFooterChange?.(null);
    };
  }, [onFooterChange]);

  async function handleNext(event: FormEvent) {
    event.preventDefault();
    setValidationError(null);

    if (step === 1) {
      if (!name.trim() || !label.trim()) {
        setValidationError(t("dataModels.validation.basicRequired"));
        return;
      }
      await refresh();
      setStep(2);
      return;
    }

    if (step === 2) {
      const validFields = fields.filter((field) => field.name.trim());
      if (validFields.length === 0) {
        setValidationError(t("dataModels.validation.fieldsRequired"));
        return;
      }
      setStep(3);
      return;
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setValidationError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        label: label.trim(),
        ...(tenantWideRead ? { tenantWideRead: true } : {}),
        ...(displayField.trim() ? { displayField: displayField.trim() } : {}),
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
      };

      await createEntityDefinition(payload);
      await refresh();
      onCreated();
    } catch (submitError) {
      if (isApiClientError(submitError)) {
        toast.error(submitError.message);
      } else {
        toast.error(
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

      {validationError ? <Alert>{validationError}</Alert> : null}

      {step === 1 ? (
        <Form
          id={ENTITY_DEFINITION_WIZARD_FORM_ID}
          onSubmit={handleNext}
          className="space-y-4"
        >
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
          <div className="space-y-2">
            <Checkbox
              id="model-tenant-wide-read"
              label={t("dataModels.tenantWideRead")}
              checked={tenantWideRead}
              onChange={(event) => setTenantWideRead(event.target.checked)}
            />
            <Text className="text-muted-foreground text-sm">
              {t("dataModels.tenantWideReadHint")}
            </Text>
          </div>
          {!useModalFooter ? (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onCancel}>
                {t("entity.cancel")}
              </Button>
              <Button type="submit">{t("dataModels.next")}</Button>
            </div>
          ) : null}
        </Form>
      ) : null}

      {step === 2 ? (
        <Form
          id={ENTITY_DEFINITION_WIZARD_FORM_ID}
          onSubmit={handleNext}
          className="space-y-4"
        >
          <EntityFieldsManager
            fields={fields}
            onChange={setFields}
            canEdit
            relationTargets={relationTargets}
          />
          {fields.some((f) => f.type === "string" && f.name.trim()) ? (
            <div>
              <FieldLabel htmlFor="wizard-display-field">
                {t("dataModels.displayField", {
                  defaultValue: "Display Field",
                })}
              </FieldLabel>
              <select
                id="wizard-display-field"
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                value={displayField}
                onChange={(event) => setDisplayField(event.target.value)}
              >
                <option value="">{t("dataModels.displayFieldAuto")}</option>
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
          {!useModalFooter ? (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                {t("dataModels.back")}
              </Button>
              <Button type="button" variant="ghost" onClick={onCancel}>
                {t("entity.cancel")}
              </Button>
              <Button type="submit">{t("dataModels.next")}</Button>
            </div>
          ) : null}
        </Form>
      ) : null}

      {step === 3 ? (
        <Form
          id={ENTITY_DEFINITION_WIZARD_FORM_ID}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <ModelReview
            name={name.trim()}
            label={label.trim()}
            fields={fields}
          />
          {!useModalFooter ? (
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
          ) : null}
        </Form>
      ) : null}
    </div>
  );
}
