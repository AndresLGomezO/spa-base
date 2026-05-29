import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  buildInitialValues,
  getFormSections,
  resolveCreateForm,
  resolveEditForm,
} from "@repo/ui-builder";
import { Alert, Button, Form, Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { getEntityLabel, type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { useEntity } from "../../hooks/useEntity";
import { EntityField } from "./EntityField";

interface EntityFormProps {
  readonly entityName: EntityName;
  readonly mode: "create" | "edit";
  readonly recordId?: string;
}

export function EntityForm({ entityName, mode, recordId }: EntityFormProps) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const definition = useEntityDefinition(entityName);
  const entityState = useEntity(entityName);
  const { getById, fieldErrors, error, isSubmitting, create, update } =
    entityState;
  const layout =
    mode === "create"
      ? resolveCreateForm(definition)
      : resolveEditForm(definition);
  const sections = getFormSections(layout);
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    buildInitialValues(definition, mode),
  );
  const [isLoadingRecord, setIsLoadingRecord] = useState(mode === "edit");

  useEffect(() => {
    if (mode !== "edit" || !recordId) return;

    let cancelled = false;
    void (async () => {
      setIsLoadingRecord(true);
      const record = await getById(recordId);
      if (cancelled) return;
      if (record) {
        setValues(buildInitialValues(definition, "edit", record));
      }
      setIsLoadingRecord(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [definition, getById, mode, recordId]);

  const title = useMemo(
    () =>
      mode === "create"
        ? t("entity.createTitle", { entity: getEntityLabel(definition) })
        : t("entity.editTitle", { entity: getEntityLabel(definition) }),
    [definition, mode, t],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = { ...values };
    for (const section of sections) {
      for (const fieldName of section.fields) {
        if (payload[fieldName] === "") {
          delete payload[fieldName];
        }
      }
    }

    if (mode === "create") {
      const created = await create(payload);
      if (created) {
        navigate(`/app/${entityName}`);
      }
      return;
    }

    if (!recordId) return;
    const updated = await update(recordId, payload);
    if (updated) {
      navigate(`/app/${entityName}`);
    }
  };

  if (isLoadingRecord) {
    return <Text>{t("entity.loading")}</Text>;
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <Heading level={1}>{title}</Heading>
      {error ? <Alert>{error}</Alert> : null}
      <Form onSubmit={(event) => void handleSubmit(event)}>
        {sections.map((section, index) => (
          <div
            key={`${section.title ?? "section"}-${index}`}
            className="flex flex-col gap-4"
          >
            {section.title ? (
              <Heading level={2}>{section.title}</Heading>
            ) : null}
            {section.fields.map((fieldName) => (
              <EntityField
                key={fieldName}
                entityName={entityName}
                fieldName={fieldName}
                value={values[fieldName]}
                error={fieldErrors[fieldName]}
                onChange={(name, value) =>
                  setValues((current) => ({ ...current, [name]: value }))
                }
              />
            ))}
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={isSubmitting}>
            {t("entity.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/app/${entityName}`)}
          >
            {t("entity.cancel")}
          </Button>
        </div>
      </Form>
    </div>
  );
}
