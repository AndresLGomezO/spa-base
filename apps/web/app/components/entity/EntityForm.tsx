import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Alert, Button, Form, Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import {
  getEditableFieldNames,
  getEntityDefinition,
  type EntityName,
} from "../../entities/entity-catalog";
import { useEntity } from "../../hooks/useEntity";
import { EntityField } from "./EntityField";

interface EntityFormProps {
  readonly entityName: EntityName;
  readonly mode: "create" | "edit";
  readonly recordId?: string;
}

function buildInitialValues(
  entityName: EntityName,
  record?: Record<string, unknown>,
): Record<string, unknown> {
  const entity = getEntityDefinition(entityName).entity;
  const values: Record<string, unknown> = {};

  const fields = entity.metadata.fields as Record<
    string,
    {
      readonly type: string;
      readonly required: boolean;
      readonly default?: unknown;
    }
  >;

  for (const fieldName of getEditableFieldNames(entity)) {
    const meta = fields[fieldName];
    if (record && fieldName in record) {
      values[fieldName] = record[fieldName];
    } else if (meta.default !== undefined) {
      values[fieldName] = meta.default;
    } else if (meta.type === "boolean") {
      values[fieldName] = false;
    } else {
      values[fieldName] = "";
    }
  }

  return values;
}

export function EntityForm({ entityName, mode, recordId }: EntityFormProps) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const entityState = useEntity(entityName);
  const { getById, fieldErrors, error, isSubmitting, create, update } =
    entityState;
  const entity = getEntityDefinition(entityName).entity;
  const fieldNames = getEditableFieldNames(entity);
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    buildInitialValues(entityName),
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
        setValues(buildInitialValues(entityName, record));
      }
      setIsLoadingRecord(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [entityName, getById, mode, recordId]);

  const title = useMemo(
    () =>
      mode === "create"
        ? t("entity.createTitle", { entity: t(`nav.${entityName}`) })
        : t("entity.editTitle", { entity: t(`nav.${entityName}`) }),
    [entityName, mode, t],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = { ...values };
    for (const fieldName of fieldNames) {
      if (payload[fieldName] === "") {
        delete payload[fieldName];
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
        {fieldNames.map((fieldName) => (
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
