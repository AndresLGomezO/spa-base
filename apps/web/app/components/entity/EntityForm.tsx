import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  buildInitialValues,
  getFormSections,
  isFieldEditable,
  isFieldVisible,
  resolveCreateForm,
  resolveEditForm,
} from "@repo/ui-builder";
import { Button, Form, Heading, toast, Alert } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { EntityFormSkeleton } from "../loading/EntityFormSkeleton";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import {
  getFieldAccessLevel,
  useFieldAccess,
} from "../../hooks/useFieldAccess";
import { useEntity } from "../../hooks/useEntity";
import { getRecordAccess } from "../../hooks/useRecordAccess";
import {
  getEntityRelationTargets,
  syncEntityRelationTargets,
} from "../../lib/api-client";
import { EntityField } from "./EntityField";
import {
  getJoinRelationFieldNames,
  splitEntityFormPayload,
} from "./entity-form-payload";

interface EntityFormProps {
  readonly entityName: EntityName;
  readonly mode: "create" | "edit";
  readonly recordId?: string;
  readonly onCancel: () => void;
  readonly onSuccess?: () => void;
  readonly hideActions?: boolean;
  readonly onSubmittingChange?: (isSubmitting: boolean) => void;
  readonly onRecordLoaded?: (record: Record<string, unknown>) => void;
}

export const ENTITY_FORM_ID = "entity-form";

function cleanFormValues(
  sections: ReturnType<typeof getFormSections>,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const payload = { ...values };
  for (const section of sections) {
    for (const fieldName of section.fields) {
      if (payload[fieldName] === "") {
        delete payload[fieldName];
      }
    }
  }
  return payload;
}

export function EntityForm({
  entityName,
  mode,
  recordId,
  onCancel,
  onSuccess,
  hideActions = false,
  onSubmittingChange,
  onRecordLoaded,
}: EntityFormProps) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const entityPermissions = useEntityPermissions(entityName);
  const fieldAccess = useFieldAccess(entityName);
  const entityState = useEntity(entityName);
  const { getById, fieldErrors, error, isSubmitting, create, update } =
    entityState;
  const layout =
    mode === "create"
      ? resolveCreateForm(definition)
      : resolveEditForm(definition);
  const sections = getFormSections(layout, definition.ui.fields);
  const joinRelationFieldNames = useMemo(
    () => getJoinRelationFieldNames(definition),
    [definition],
  );
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial = buildInitialValues(definition, mode);
    for (const fieldName of getJoinRelationFieldNames(definition)) {
      initial[fieldName] = [];
    }
    return initial;
  });
  const [isLoadingRecord, setIsLoadingRecord] = useState(mode === "edit");
  const [loadedRecord, setLoadedRecord] = useState<Record<
    string,
    unknown
  > | null>(null);
  const lastToastedError = useRef<string | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !recordId) return;

    let cancelled = false;
    void (async () => {
      setIsLoadingRecord(true);
      const record = await getById(recordId);
      if (cancelled) return;

      const nextValues = record
        ? buildInitialValues(definition, "edit", record)
        : buildInitialValues(definition, "edit");

      if (record) {
        setLoadedRecord(record);
        onRecordLoaded?.(record);
        const relationEntries = await Promise.all(
          joinRelationFieldNames.map(async (fieldName) => {
            const targetIds = await getEntityRelationTargets(
              entityName,
              recordId,
              fieldName,
            );
            return [fieldName, targetIds] as const;
          }),
        );

        for (const [fieldName, targetIds] of relationEntries) {
          nextValues[fieldName] = targetIds;
        }
      }

      setValues(nextValues);
      setIsLoadingRecord(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    definition,
    entityName,
    getById,
    joinRelationFieldNames,
    mode,
    onRecordLoaded,
    recordId,
  ]);

  const recordAccess = loadedRecord ? getRecordAccess(loadedRecord) : null;
  const isSharedEditor =
    mode === "edit" &&
    recordAccess != null &&
    !recordAccess.isOwner &&
    recordAccess.sharePermission != null;
  const canWrite =
    mode === "create"
      ? entityPermissions.canCreate
      : (recordAccess?.canWrite ?? entityPermissions.canUpdate);

  useEffect(() => {
    if (!error || error === lastToastedError.current) {
      return;
    }
    lastToastedError.current = error;
    toast.error(error);
  }, [error]);

  useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanedValues = cleanFormValues(sections, values);
    const { documentPayload, joinRelations } = splitEntityFormPayload(
      definition,
      cleanedValues,
    );

    if (mode === "create") {
      const created = await create(documentPayload);
      if (!created) {
        return;
      }

      try {
        for (const [fieldName, targetIds] of Object.entries(joinRelations)) {
          await syncEntityRelationTargets(
            entityName,
            created.id,
            fieldName,
            targetIds,
          );
        }
        onSuccess?.();
      } catch (syncError) {
        toast.error(
          syncError instanceof Error
            ? syncError.message
            : t("entity.relationSyncFailed"),
        );
      }
      return;
    }

    if (!recordId) return;

    const updated = await update(recordId, documentPayload);
    if (!updated) {
      return;
    }

    try {
      for (const [fieldName, targetIds] of Object.entries(joinRelations)) {
        await syncEntityRelationTargets(
          entityName,
          recordId,
          fieldName,
          targetIds,
        );
      }
      onSuccess?.();
    } catch (syncError) {
      toast.error(
        syncError instanceof Error
          ? syncError.message
          : t("entity.relationSyncFailed"),
      );
    }
  };

  if (isLoadingRecord) {
    return <EntityFormSkeleton />;
  }

  return (
    <Form
      id={ENTITY_FORM_ID}
      className="px-1"
      onSubmit={(event) => void handleSubmit(event)}
    >
      {isSharedEditor ? (
        <Alert className="mb-4">{t("entity.sharedRecordBanner")}</Alert>
      ) : null}
      {sections.map((section, index) => (
        <div
          key={`${section.title ?? "section"}-${index}`}
          className="flex flex-col gap-4"
        >
          {section.title ? <Heading level={2}>{section.title}</Heading> : null}
          {section.fields.map((fieldName) => {
            const fieldUI = definition.ui.fields?.[fieldName];
            const access = getFieldAccessLevel(fieldAccess, fieldName);
            if (!isFieldVisible(fieldUI, entityPermissions.canRead, access)) {
              return null;
            }

            return (
              <EntityField
                key={fieldName}
                entityName={entityName}
                fieldName={fieldName}
                value={values[fieldName]}
                error={fieldErrors[fieldName]}
                readOnly={!isFieldEditable(fieldUI, canWrite, access)}
                onChange={(name, value) =>
                  setValues((current) => ({ ...current, [name]: value }))
                }
              />
            );
          })}
        </div>
      ))}
      {!hideActions ? (
        <div className="flex items-center gap-3">
          <Button type="submit" loading={isSubmitting}>
            {t("entity.save")}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("entity.cancel")}
          </Button>
        </div>
      ) : null}
    </Form>
  );
}
