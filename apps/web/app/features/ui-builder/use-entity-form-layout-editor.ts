import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createDefaultModalFooterLayout,
  createDefaultWizardShellLayout,
  createDefaultWizardStepLayout,
  createLayoutId,
  ensureContainerRoot,
  ensureWizardShellLayout,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import {
  normalizeEntityViews,
  resolveFormModalChrome,
  resolveFormModalFooterLayout,
  resolveFormModalSize,
  resolveFormModalSizeByBreakpointFromDefinition,
  resolveFormModalSizeEditBreakpoint,
  resolveFormModalSizeForPreviewBreakpoint,
  resolveFormModalSizeInheritanceSource,
  isFormModalSizeExplicitAtBreakpoint,
  serializeFormModalSizeByBreakpoint,
  resolveFormPresentation,
  resolvePlainFormLayout,
  resolveWizardForm,
  type FormModalChrome,
  type FormModalPreviewBreakpoint,
  type FormModalSize,
  type FormModalSizeByBreakpoint,
  type FormPresentation,
  type DesignLayoutSliceData,
  type FormsSliceData,
  type WizardFormConfig,
  type WizardStepConfig,
} from "@repo/entities";
import { useQueryClient } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { patchEntityCatalogAfterUiOverrideSave } from "./patch-entity-catalog-after-ui-override-save";

function getDefaultFieldPaths(
  definition: ReturnType<typeof useEntityDefinition>,
) {
  return Object.keys(definition.fields).filter(
    (field) => definition.fields[field]?.type !== "document",
  );
}

function preserveViews(definition: ReturnType<typeof useEntityDefinition>) {
  return [...definition.ui.views];
}

function defaultModalFooterActionKind(
  presentation: FormPresentation,
): "form-actions" | "wizard-actions" {
  return presentation === "wizard" ? "wizard-actions" : "form-actions";
}

export function useEntityFormLayoutEditor(entityName: EntityName) {
  const definition = useEntityDefinition(entityName);
  const queryClient = useQueryClient();
  const fieldPaths = useMemo(
    () => getDefaultFieldPaths(definition),
    [definition],
  );
  const defaultFieldPath = fieldPaths[0] ?? "name";

  const [presentation, setPresentation] = useState<FormPresentation>(() =>
    resolveFormPresentation(definition),
  );
  const [modalSize, setModalSize] = useState<FormModalSize>(() =>
    resolveFormModalSize(definition),
  );
  const [modalSizeByBreakpoint, setModalSizeByBreakpoint] =
    useState<FormModalSizeByBreakpoint>(() =>
      resolveFormModalSizeByBreakpointFromDefinition(definition),
    );
  const [modalChrome, setModalChrome] = useState<FormModalChrome>(() =>
    resolveFormModalChrome(definition),
  );
  const [modalFooterLayout, setModalFooterLayout] = useState<
    UiLayoutDocument | undefined
  >(() => resolveFormModalFooterLayout(definition));
  const [plainLayout, setPlainLayoutState] = useState<UiLayoutDocument>(() =>
    ensureContainerRoot(resolvePlainFormLayout(definition)),
  );
  const setPlainLayout = useCallback((layout: UiLayoutDocument) => {
    setPlainLayoutState(ensureContainerRoot(layout));
  }, []);
  const resolveWizardState = useCallback(
    (
      sourceDefinition: ReturnType<typeof useEntityDefinition>,
    ): WizardFormConfig => {
      const footerLayout = resolveFormModalFooterLayout(sourceDefinition);
      const resolved = resolveWizardForm(sourceDefinition);

      if (resolved) {
        return {
          ...resolved,
          shellLayout: ensureContainerRoot(
            ensureWizardShellLayout(resolved.shellLayout, {
              actionsInModalFooter: footerLayout != null,
            }),
          ),
          steps: resolved.steps.map((step) => ({
            ...step,
            layout: ensureContainerRoot(step.layout),
          })),
        };
      }

      return {
        shellLayout: ensureContainerRoot(
          ensureWizardShellLayout(createDefaultWizardShellLayout(), {
            actionsInModalFooter: footerLayout != null,
          }),
        ),
        steps: [],
      };
    },
    [],
  );

  const [wizard, setWizard] = useState<WizardFormConfig>(() =>
    resolveWizardState(definition),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [layoutEditorKey, setLayoutEditorKey] = useState(0);

  useEffect(() => {
    setPresentation(resolveFormPresentation(definition));
    setModalSize(resolveFormModalSize(definition));
    setModalSizeByBreakpoint(
      resolveFormModalSizeByBreakpointFromDefinition(definition),
    );
    setModalChrome(resolveFormModalChrome(definition));
    setModalFooterLayout(resolveFormModalFooterLayout(definition));
    const resolvedPlain = resolvePlainFormLayout(definition);
    setPlainLayout(resolvedPlain);
    setWizard(resolveWizardState(definition));
    setLayoutEditorKey((current) => current + 1);
  }, [definition, resolveWizardState, setPlainLayout]);

  const updateStep = useCallback(
    (index: number, patch: Partial<WizardStepConfig>) => {
      setWizard((current) => ({
        ...current,
        steps: current.steps.map((step, stepIndex) =>
          stepIndex === index
            ? {
                ...step,
                ...patch,
                ...(patch.layout
                  ? { layout: ensureContainerRoot(patch.layout) }
                  : {}),
              }
            : step,
        ),
      }));
    },
    [],
  );

  const addStep = useCallback(
    (
      fields: Pick<WizardStepConfig, "label"> &
        Partial<Pick<WizardStepConfig, "subtitle" | "icon">>,
    ): number => {
      const step: WizardStepConfig = {
        id: createLayoutId("step"),
        label: fields.label,
        subtitle: fields.subtitle,
        icon: fields.icon,
        layout: createDefaultWizardStepLayout(fieldPaths),
      };

      let nextIndex = 0;
      setWizard((current) => {
        nextIndex = current.steps.length;
        return {
          ...current,
          steps: [...current.steps, step],
        };
      });

      return nextIndex;
    },
    [fieldPaths],
  );

  const removeStep = useCallback((index: number) => {
    setWizard((current) => ({
      ...current,
      steps: current.steps.filter((_, stepIndex) => stepIndex !== index),
    }));
  }, []);

  const setShowModalHeader = useCallback((showHeader: boolean) => {
    setModalChrome((current) => ({ ...current, showHeader }));
  }, []);

  const setFlushModalContent = useCallback((flushContent: boolean) => {
    setModalChrome((current) => ({
      ...current,
      contentPadding: flushContent ? "none" : "default",
    }));
  }, []);

  const enableModalFooterLayout = useCallback(() => {
    setModalFooterLayout(
      (current) =>
        current ??
        createDefaultModalFooterLayout(
          defaultModalFooterActionKind(presentation),
        ),
    );
    setWizard((current) => ({
      ...current,
      shellLayout: ensureWizardShellLayout(current.shellLayout, {
        actionsInModalFooter: true,
      }),
    }));
  }, [presentation]);

  const disableModalFooterLayout = useCallback(() => {
    setModalFooterLayout(undefined);
    setWizard((current) => ({
      ...current,
      shellLayout: ensureWizardShellLayout(current.shellLayout, {
        actionsInModalFooter: false,
      }),
    }));
  }, []);

  const modalSizeFormsState = useMemo(
    () => ({
      modalSize,
      modalSizeByBreakpoint,
    }),
    [modalSize, modalSizeByBreakpoint],
  );

  const getResolvedModalSizeAtBreakpoint = useCallback(
    (previewBreakpoint: FormModalPreviewBreakpoint) =>
      resolveFormModalSizeForPreviewBreakpoint(
        modalSizeFormsState,
        previewBreakpoint,
      ),
    [modalSizeFormsState],
  );

  const isModalSizeExplicitAtBreakpoint = useCallback(
    (previewBreakpoint: FormModalPreviewBreakpoint) =>
      isFormModalSizeExplicitAtBreakpoint(
        modalSizeFormsState,
        previewBreakpoint,
      ),
    [modalSizeFormsState],
  );

  const getModalSizeInheritanceSource = useCallback(
    (previewBreakpoint: FormModalPreviewBreakpoint) =>
      resolveFormModalSizeInheritanceSource(
        modalSizeFormsState,
        previewBreakpoint,
      ),
    [modalSizeFormsState],
  );

  const setModalSizeForPreviewBreakpoint = useCallback(
    (previewBreakpoint: FormModalPreviewBreakpoint, size: FormModalSize) => {
      const breakpoint = resolveFormModalSizeEditBreakpoint(previewBreakpoint);
      if (breakpoint === "xl") {
        setModalSize(size);
        setModalSizeByBreakpoint((current) => {
          if (current.xl === undefined) {
            return current;
          }
          const { xl: _removed, ...rest } = current;
          void _removed;
          return rest;
        });
        return;
      }

      setModalSizeByBreakpoint((current) => ({
        ...current,
        [breakpoint]: size,
      }));
    },
    [],
  );

  const clearModalSizeOverride = useCallback(
    (previewBreakpoint: FormModalPreviewBreakpoint) => {
      const breakpoint = resolveFormModalSizeEditBreakpoint(previewBreakpoint);
      if (breakpoint === "xl") {
        return;
      }

      setModalSizeByBreakpoint((current) => {
        if (current[breakpoint] === undefined) {
          return current;
        }
        const { [breakpoint]: _removed, ...rest } = current;
        void _removed;
        return rest;
      });
    },
    [],
  );

  const save = useCallback(async (): Promise<string | null> => {
    setIsSaving(true);
    try {
      const views = preserveViews(definition);
      const basePayload = {
        views: normalizeEntityViews(views),
        ...(definition.ui.listViewType
          ? { listViewType: definition.ui.listViewType }
          : {}),
      };

      const wizardToSave =
        presentation === "wizard"
          ? {
              ...wizard,
              shellLayout: ensureWizardShellLayout(wizard.shellLayout, {
                actionsInModalFooter: modalFooterLayout != null,
              }),
            }
          : wizard;

      const shouldPersistModalChrome =
        modalChrome.showHeader !== true ||
        modalChrome.contentPadding !== "default" ||
        definition.ui.forms.modalChrome != null;

      const persistedModalSizeByBreakpoint = serializeFormModalSizeByBreakpoint(
        modalSize,
        modalSizeByBreakpoint,
      );

      const formsPayload = {
        presentation,
        modalSize,
        ...(persistedModalSizeByBreakpoint
          ? { modalSizeByBreakpoint: persistedModalSizeByBreakpoint }
          : {}),
        ...(shouldPersistModalChrome ? { modalChrome } : {}),
        ...(modalFooterLayout ? { modalFooterLayout } : {}),
        ...(presentation === "wizard"
          ? { wizard: wizardToSave }
          : { layout: plainLayout }),
      };

      const { override } = await putEntityUiOverride(entityName, {
        ...basePayload,
        forms: formsPayload,
      });

      patchEntityCatalogAfterUiOverrideSave(queryClient, entityName, override);
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Failed to save form layout.";
    } finally {
      setIsSaving(false);
    }
  }, [
    definition,
    entityName,
    modalChrome,
    modalFooterLayout,
    modalSize,
    modalSizeByBreakpoint,
    plainLayout,
    presentation,
    queryClient,
    wizard,
  ]);

  const exportSlice = useCallback((): FormsSliceData => {
    const wizardToExport =
      presentation === "wizard"
        ? {
            ...wizard,
            shellLayout: ensureWizardShellLayout(wizard.shellLayout, {
              actionsInModalFooter: modalFooterLayout != null,
            }),
          }
        : wizard;

    const shouldPersistModalChrome =
      modalChrome.showHeader !== true ||
      modalChrome.contentPadding !== "default" ||
      definition.ui.forms.modalChrome != null;

    const persistedModalSizeByBreakpoint = serializeFormModalSizeByBreakpoint(
      modalSize,
      modalSizeByBreakpoint,
    );

    return {
      presentation,
      modalSize,
      ...(persistedModalSizeByBreakpoint
        ? { modalSizeByBreakpoint: persistedModalSizeByBreakpoint }
        : {}),
      ...(shouldPersistModalChrome ? { modalChrome } : {}),
      ...(modalFooterLayout ? { modalFooterLayout } : {}),
      ...(presentation === "wizard"
        ? { wizard: wizardToExport }
        : { layout: plainLayout }),
    };
  }, [
    definition.ui.forms.modalChrome,
    modalChrome,
    modalFooterLayout,
    modalSize,
    modalSizeByBreakpoint,
    plainLayout,
    presentation,
    wizard,
  ]);

  const applySlice = useCallback(
    (data: DesignLayoutSliceData) => {
      const formsData = data as FormsSliceData;
      const nextPresentation = formsData.presentation ?? "plain";
      setPresentation(nextPresentation);
      if (formsData.modalSize) {
        setModalSize(formsData.modalSize);
      }
      setModalSizeByBreakpoint(formsData.modalSizeByBreakpoint ?? {});
      if (formsData.modalChrome) {
        setModalChrome(formsData.modalChrome);
      } else {
        setModalChrome(resolveFormModalChrome(definition));
      }
      setModalFooterLayout(formsData.modalFooterLayout);
      if (formsData.layout) {
        setPlainLayout(formsData.layout);
      }
      if (formsData.wizard) {
        setWizard({
          ...formsData.wizard,
          shellLayout: ensureWizardShellLayout(formsData.wizard.shellLayout, {
            actionsInModalFooter: formsData.modalFooterLayout != null,
          }),
        });
      }
      setLayoutEditorKey((current) => current + 1);
    },
    [definition, setPlainLayout],
  );

  return {
    entityName,
    definition,
    fieldPaths,
    defaultFieldPath,
    modalSize,
    setModalSize,
    modalSizeByBreakpoint,
    setModalSizeByBreakpoint,
    setModalSizeForPreviewBreakpoint,
    clearModalSizeOverride,
    getResolvedModalSizeAtBreakpoint,
    isModalSizeExplicitAtBreakpoint,
    getModalSizeInheritanceSource,
    modalChrome,
    setShowModalHeader,
    setFlushModalContent,
    modalFooterLayout,
    setModalFooterLayout,
    enableModalFooterLayout,
    disableModalFooterLayout,
    presentation,
    setPresentation,
    plainLayout,
    setPlainLayout,
    wizard,
    setWizard,
    setShellLayout: (shellLayout: UiLayoutDocument) =>
      setWizard((current) => ({
        ...current,
        shellLayout: ensureContainerRoot(
          ensureWizardShellLayout(shellLayout, {
            actionsInModalFooter: modalFooterLayout != null,
          }),
        ),
      })),
    updateStep,
    addStep,
    removeStep,
    isSaving,
    save,
    layoutEditorKey,
    exportSlice,
    applySlice,
  };
}

export type UseEntityFormLayoutEditorResult = ReturnType<
  typeof useEntityFormLayoutEditor
>;
