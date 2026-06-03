import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { collectLayoutFieldPaths } from "@repo/ui-builder-core";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  resolveCreateFormFromLayout,
  resolveEditFormFromUi,
} from "@repo/entities";
import {
  buildInitialValues,
  getFormSections,
  isFieldEditable,
  isFieldVisible,
} from "@repo/ui-builder";
import { Button, Form, Heading, toast } from "@repo/ui";
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
import {
  getEntityRelationTargets,
  syncEntityRelationTargets,
} from "../../lib/api-client";
import { createEntityFormRenderContext } from "../../features/ui-builder/create-entity-form-render-context";
import { ENTITY_FORM_ID } from "./entity-form-constants";
import { EntityField } from "./EntityField";
import {
  getJoinRelationFieldNames,
  splitEntityFormPayload,
} from "./entity-form-payload";

export { ENTITY_FORM_ID } from "./entity-form-constants";

interface EntityFormProps {
  readonly entityName: EntityName;
  readonly mode: "create" | "edit";
  readonly recordId?: string;
  readonly onCancel: () => void;
  readonly onSuccess?: () => void;
  readonly hideActions?: boolean;
  readonly onSubmittingChange?: (isSubmitting: boolean) => void;
}

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
}: EntityFormProps) {
  const { t, i18n } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const entityPermissions = useEntityPermissions(entityName);
  const fieldAccess = useFieldAccess(entityName);
  const canWrite =
    mode === "create"
      ? entityPermissions.canCreate
      : entityPermissions.canUpdate;
  const entityState = useEntity(entityName);
  const { getById, fieldErrors, error, isSubmitting, create, update } =
    entityState;
  const layout =
    mode === "create"
      ? resolveCreateFormFromLayout(definition)
      : resolveEditFormFromUi(definition);
  const sections = getFormSections(layout, definition.ui.fields);
  const designedLayout = layout.layout;
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
  }, [definition, entityName, getById, joinRelationFieldNames, mode, recordId]);

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
    const cleanSections = designedLayout
      ? [{ fields: collectLayoutFieldPaths(designedLayout) }]
      : sections;
    const cleanedValues = cleanFormValues(cleanSections, values);
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

  if (designedLayout) {
    return (
      <Form
        id={ENTITY_FORM_ID}
        className="px-1"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <RecursiveLayoutRenderer
          layout={designedLayout}
          context={createEntityFormRenderContext({
            entityName,
            definition,
            locale: i18n.language,
            mode,
            values,
            errors: fieldErrors,
            fieldAccess,
            canRead: entityPermissions.canRead,
            canWrite,
            recordId,
            onChange: (name, value) =>
              setValues((current) => ({ ...current, [name]: value })),
            onCancel,
            hideActions,
            isSubmitting,
            cancelLabel: t("entity.cancel"),
            saveLabel: t("entity.save"),
          })}
        />
      </Form>
    );
  }

  return (
    <Form
      id={ENTITY_FORM_ID}
      className="px-1"
      onSubmit={(event) => void handleSubmit(event)}
    >
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
                recordId={recordId}
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
