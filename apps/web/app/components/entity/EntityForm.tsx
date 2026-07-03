import {
  buildInitialValuesFromLayout,
  resolveFormPresentation,
  resolvePlainFormLayout,
  resolveWizardForm,
} from "@repo/entities";
import { Form, toast } from "@repo/ui";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { collectLayoutFieldPaths } from "@repo/ui-builder-core";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { getEntityLabel, type EntityName } from "../../entities/entity-catalog";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useEntitySaveManager } from "../../features/entity-save/entity-save-context";
import { createEntityFormRenderContext } from "../../features/ui-builder/create-entity-form-render-context";
import { useNavigateComponentClick } from "../../features/ui-builder/ComponentClickTargetWrapper";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import { useFieldAccess } from "../../hooks/useFieldAccess";
import { useEntity } from "../../hooks/useEntity";
import { getEntityRelationTargets } from "../../lib/api-client";
import { EntityFormSkeleton } from "../loading/EntityFormSkeleton";
import { applyCreateFormPrefill } from "./coerce-create-form-prefill-value";
import {
  buildFormSubmitValues,
  getJoinRelationFieldNames,
  splitEntityFormPayload,
} from "./entity-form-payload";
import {
  collectFormRenderedFieldRoots,
  collectOrphanFieldErrors,
} from "./collect-form-rendered-field-roots";
import { ENTITY_FORM_ID } from "./entity-form-constants";
import {
  applyFormFieldChange,
  applyRelationDisplayCache,
} from "./form-relation-display-cache";
import {
  hasPendingPrefillRelationFetch,
  hydratePrefilledRelationDisplay,
} from "./hydrate-prefilled-relation-display";
import { EntityFormValidationSummary } from "./EntityFormValidationSummary";
import { EntityWizardForm } from "./EntityWizardForm";
import { useEntityFormModalFooter } from "./use-entity-form-modal-footer";

export { ENTITY_FORM_ID } from "./entity-form-constants";

interface EntityFormProps {
  readonly entityName: EntityName;
  readonly mode: "create" | "edit";
  readonly recordId?: string;
  readonly createPrefill?: Readonly<Record<string, string>>;
  readonly createPrefillPopulated?: Readonly<
    Record<string, Record<string, unknown> | null>
  >;
  readonly draftValues?: Readonly<Record<string, unknown>>;
  readonly draftFieldErrors?: Readonly<Record<string, string>>;
  readonly formDesignId?: string;
  readonly onCancel: () => void;
  readonly onSuccess?: () => void;
  readonly hideActions?: boolean;
  readonly modalActionPlacement?: "inline" | "footer";
  readonly modalFooterLayout?: UiLayoutDocument;
  readonly onFooterChange?: (footer: ReactNode | null) => void;
}

export function EntityForm({
  entityName,
  mode,
  recordId,
  createPrefill,
  createPrefillPopulated,
  draftValues,
  draftFieldErrors,
  formDesignId,
  onCancel,
  onSuccess,
  hideActions = false,
  modalActionPlacement = "inline",
  modalFooterLayout,
  onFooterChange,
}: EntityFormProps) {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const navigateComponentClick = useNavigateComponentClick();
  const definition = useEntityDefinition(entityName);
  const { getDefinition } = useEntityCatalog();
  const entityPermissions = useEntityPermissions(entityName);
  const fieldAccess = useFieldAccess(entityName);
  const canWrite =
    mode === "create"
      ? entityPermissions.canCreate
      : entityPermissions.canUpdate;
  const entityState = useEntity(entityName);
  const { getById, fieldErrors, error } = entityState;
  const { enqueueSave } = useEntitySaveManager();
  const presentation = resolveFormPresentation(definition, formDesignId);
  const plainLayout = resolvePlainFormLayout(definition, formDesignId);
  const wizardConfig = resolveWizardForm(definition, formDesignId);
  const joinRelationFieldNames = useMemo(
    () => getJoinRelationFieldNames(definition),
    [definition],
  );
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    if (draftValues) {
      return { ...draftValues };
    }
    let initial = buildInitialValuesFromLayout(
      definition,
      mode,
      undefined,
      formDesignId,
    );
    for (const fieldName of getJoinRelationFieldNames(definition)) {
      initial[fieldName] = [];
    }
    if (mode === "create" && createPrefill) {
      applyCreateFormPrefill(definition, initial, createPrefill);
    }
    if (mode === "create" && createPrefillPopulated) {
      for (const [fieldName, record] of Object.entries(
        createPrefillPopulated,
      )) {
        if (record) {
          initial = applyRelationDisplayCache(initial, fieldName, record);
        }
      }
    }
    return initial;
  });
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const resolvedFieldErrors = useMemo(
    () => ({
      ...fieldErrors,
      ...(draftFieldErrors ?? {}),
    }),
    [draftFieldErrors, fieldErrors],
  );
  const applyFieldChange = useCallback(
    (
      fieldName: string,
      value: unknown,
      displayRecord?: Record<string, unknown> | null,
    ) => {
      setValues((current) =>
        applyFormFieldChange(
          definition,
          current,
          fieldName,
          value,
          displayRecord,
        ),
      );
    },
    [definition],
  );
  const [isLoadingRecord, setIsLoadingRecord] = useState(mode === "edit");
  const [isHydratingPrefill, setIsHydratingPrefill] = useState(false);
  const lastToastedError = useRef<string | null>(null);

  useEffect(() => {
    if (mode !== "create") {
      return;
    }

    if (
      !hasPendingPrefillRelationFetch({
        definition,
        values: valuesRef.current,
        getDefinition,
        prefilledPopulated: createPrefillPopulated,
      })
    ) {
      return;
    }

    let cancelled = false;
    setIsHydratingPrefill(true);
    void (async () => {
      const hydrated = await hydratePrefilledRelationDisplay({
        definition,
        values: valuesRef.current,
        getDefinition,
        prefilledPopulated: createPrefillPopulated,
      });
      if (cancelled) {
        return;
      }
      setValues(hydrated);
      setIsHydratingPrefill(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [createPrefill, createPrefillPopulated, definition, getDefinition, mode]);

  useEffect(() => {
    if (mode !== "edit" || !recordId || draftValues) return;

    let cancelled = false;
    void (async () => {
      setIsLoadingRecord(true);
      const record = await getById(recordId);
      if (cancelled) return;

      const nextValues = record
        ? buildInitialValuesFromLayout(definition, "edit", record, formDesignId)
        : buildInitialValuesFromLayout(
            definition,
            "edit",
            undefined,
            formDesignId,
          );

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
  }, [
    definition,
    entityName,
    formDesignId,
    getById,
    joinRelationFieldNames,
    mode,
    recordId,
    draftValues,
  ]);

  useEffect(() => {
    if (!error || error === lastToastedError.current) {
      return;
    }
    lastToastedError.current = error;
    toast.error(error);
  }, [error]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitFieldPaths =
      presentation === "wizard" && wizardConfig
        ? wizardConfig.steps.flatMap((step) =>
            collectLayoutFieldPaths(step.layout),
          )
        : collectLayoutFieldPaths(plainLayout);
    const cleanedValues = buildFormSubmitValues(
      submitFieldPaths,
      valuesRef.current,
    );
    const { documentPayload, joinRelations } = splitEntityFormPayload(
      definition,
      cleanedValues,
    );

    enqueueSave({
      entityName,
      entityLabel: getEntityLabel(definition),
      mode,
      recordId,
      documentPayload,
      joinRelations,
      draftValues: cleanedValues,
      formDesignId,
      createPrefill,
      createPrefillPopulated,
    });

    onSuccess?.();
  };

  const saveLabel = mode === "create" ? t("entity.create") : t("entity.save");
  const suppressInlineActions =
    hideActions || modalActionPlacement === "footer";

  const designedFormContext = useMemo(
    () =>
      createEntityFormRenderContext({
        entityName,
        definition,
        locale: i18n.language,
        mode,
        values,
        errors: resolvedFieldErrors,
        fieldAccess,
        canRead: entityPermissions.canRead,
        canWrite,
        recordId,
        onChange: applyFieldChange,
        onCancel,
        hideActions: suppressInlineActions,
        isSubmitting: false,
        cancelLabel: t("entity.cancel"),
        saveLabel,
        getDefinition,
        navigate,
        navigateComponentClick,
      }),
    [
      definition,
      entityName,
      entityPermissions.canRead,
      fieldAccess,
      resolvedFieldErrors,
      applyFieldChange,
      canWrite,
      getDefinition,
      navigate,
      navigateComponentClick,
      i18n.language,
      mode,
      onCancel,
      recordId,
      saveLabel,
      suppressInlineActions,
      t,
      values,
    ],
  );

  const footerFormContext = useMemo(
    () =>
      createEntityFormRenderContext({
        entityName,
        definition,
        locale: i18n.language,
        mode,
        values,
        errors: resolvedFieldErrors,
        fieldAccess,
        canRead: entityPermissions.canRead,
        canWrite,
        recordId,
        onChange: applyFieldChange,
        onCancel,
        hideActions: false,
        isSubmitting: false,
        cancelLabel: t("entity.cancel"),
        saveLabel,
        getDefinition,
        navigate,
        navigateComponentClick,
      }),
    [
      applyFieldChange,
      definition,
      entityName,
      entityPermissions.canRead,
      fieldAccess,
      resolvedFieldErrors,
      canWrite,
      getDefinition,
      navigate,
      navigateComponentClick,
      i18n.language,
      mode,
      onCancel,
      recordId,
      saveLabel,
      t,
      values,
    ],
  );

  useEntityFormModalFooter({
    enabled: modalActionPlacement === "footer" && presentation !== "wizard",
    onFooterChange,
    modalFooterLayout,
    fallbackLayout: plainLayout,
    footerContext: footerFormContext,
  });

  const renderedFieldRoots = useMemo(
    () =>
      collectFormRenderedFieldRoots({
        layouts: [plainLayout],
        definition,
        fieldAccess,
        canRead: entityPermissions.canRead,
      }),
    [plainLayout, definition, fieldAccess, entityPermissions.canRead],
  );

  const orphanFieldErrors = useMemo(
    () => collectOrphanFieldErrors(resolvedFieldErrors, renderedFieldRoots),
    [resolvedFieldErrors, renderedFieldRoots],
  );

  if (isLoadingRecord || isHydratingPrefill) {
    return <EntityFormSkeleton />;
  }

  if (presentation === "wizard" && wizardConfig) {
    return (
      <EntityWizardForm
        entityName={entityName}
        definition={definition}
        mode={mode}
        wizard={wizardConfig}
        locale={i18n.language}
        values={values}
        fieldErrors={resolvedFieldErrors}
        fieldAccess={fieldAccess}
        canRead={entityPermissions.canRead}
        canWrite={canWrite}
        recordId={recordId}
        onChange={applyFieldChange}
        onCancel={onCancel}
        hideActions={suppressInlineActions}
        modalActionPlacement={modalActionPlacement}
        modalFooterLayout={modalFooterLayout}
        onFooterChange={onFooterChange}
        isSubmitting={false}
        cancelLabel={t("entity.cancel")}
        saveLabel={saveLabel}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <Form id={ENTITY_FORM_ID} onSubmit={(event) => void handleSubmit(event)}>
      <EntityFormValidationSummary
        errors={orphanFieldErrors}
        definition={definition}
      />
      <RecursiveLayoutRenderer
        layout={plainLayout}
        context={designedFormContext}
      />
    </Form>
  );
}
