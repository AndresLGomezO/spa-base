import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createDefaultModalFooterLayout,
  createDefaultWizardFormConfig,
  createDefaultWizardStepLayout,
  createDefaultWizardSummaryStepLayout,
  createLayoutId,
  ensureWizardShellLayout,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import {
  createDefaultFormLayout,
  normalizeEntityViews,
  resolveFormModalChrome,
  resolveFormModalFooterLayout,
  resolveFormModalSize,
  resolveFormPresentation,
  resolvePlainFormLayout,
  resolveWizardForm,
  type FormModalChrome,
  type FormModalSize,
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
  const [modalChrome, setModalChrome] = useState<FormModalChrome>(() =>
    resolveFormModalChrome(definition),
  );
  const [modalFooterLayout, setModalFooterLayout] = useState<
    UiLayoutDocument | undefined
  >(() => resolveFormModalFooterLayout(definition));
  const [plainLayout, setPlainLayout] = useState<UiLayoutDocument>(
    () =>
      resolvePlainFormLayout(definition).layout ??
      createDefaultFormLayout(fieldPaths),
  );
  const [wizard, setWizard] = useState<WizardFormConfig>(() => {
    const initial =
      resolveWizardForm(definition) ??
      createDefaultWizardFormConfig(fieldPaths);
    const footerLayout = resolveFormModalFooterLayout(definition);
    return {
      ...initial,
      shellLayout: ensureWizardShellLayout(initial.shellLayout, {
        actionsInModalFooter: footerLayout != null,
      }),
    };
  });
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [layoutEditorKey, setLayoutEditorKey] = useState(0);

  useEffect(() => {
    setPresentation(resolveFormPresentation(definition));
    setModalSize(resolveFormModalSize(definition));
    setModalChrome(resolveFormModalChrome(definition));
    setModalFooterLayout(resolveFormModalFooterLayout(definition));
    const resolvedPlain = resolvePlainFormLayout(definition).layout;
    if (resolvedPlain) {
      setPlainLayout(resolvedPlain);
    } else {
      setPlainLayout(createDefaultFormLayout(fieldPaths));
    }
    const resolvedWizard =
      resolveWizardForm(definition) ??
      createDefaultWizardFormConfig(fieldPaths);
    const footerLayout = resolveFormModalFooterLayout(definition);
    setWizard({
      ...resolvedWizard,
      shellLayout: ensureWizardShellLayout(resolvedWizard.shellLayout, {
        actionsInModalFooter: footerLayout != null,
      }),
    });
    setLayoutEditorKey((current) => current + 1);
  }, [definition, fieldPaths]);

  const selectedStep = wizard.steps[selectedStepIndex];

  const updateStep = useCallback(
    (index: number, patch: Partial<WizardStepConfig>) => {
      setWizard((current) => ({
        ...current,
        steps: current.steps.map((step, stepIndex) =>
          stepIndex === index ? { ...step, ...patch } : step,
        ),
      }));
    },
    [],
  );

  const addStep = useCallback(() => {
    const nextIndex = wizard.steps.length + 1;
    setWizard((current) => ({
      ...current,
      steps: [
        ...current.steps,
        {
          id: createLayoutId("step"),
          label: `Step ${nextIndex}`,
          layout: createDefaultWizardStepLayout(fieldPaths),
        },
      ],
    }));
    setSelectedStepIndex(wizard.steps.length);
  }, [fieldPaths, wizard.steps.length]);

  const addSummaryStep = useCallback(() => {
    setWizard((current) => ({
      ...current,
      steps: [
        ...current.steps,
        {
          id: createLayoutId("step"),
          label: "Review",
          layout: createDefaultWizardSummaryStepLayout(),
        },
      ],
    }));
    setSelectedStepIndex(wizard.steps.length);
  }, [wizard.steps.length]);

  const removeStep = useCallback(
    (index: number) => {
      if (wizard.steps.length <= 1) {
        return;
      }
      setWizard((current) => ({
        ...current,
        steps: current.steps.filter((_, stepIndex) => stepIndex !== index),
      }));
      setSelectedStepIndex((current) =>
        Math.min(current, Math.max(0, wizard.steps.length - 2)),
      );
    },
    [wizard.steps.length],
  );

  const moveStep = useCallback((index: number, direction: -1 | 1) => {
    setWizard((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.steps.length) {
        return current;
      }
      const steps = [...current.steps];
      const [item] = steps.splice(index, 1);
      if (!item) {
        return current;
      }
      steps.splice(target, 0, item);
      return { ...current, steps };
    });
    setSelectedStepIndex((current) => {
      const target = current + direction;
      if (current === index) {
        return target;
      }
      return current;
    });
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

      const formsPayload = {
        presentation,
        modalSize,
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

    return {
      presentation,
      modalSize,
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
        setSelectedStepIndex(0);
      }
      setLayoutEditorKey((current) => current + 1);
    },
    [definition],
  );

  return {
    entityName,
    definition,
    fieldPaths,
    defaultFieldPath,
    modalSize,
    setModalSize,
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
        shellLayout: ensureWizardShellLayout(shellLayout, {
          actionsInModalFooter: modalFooterLayout != null,
        }),
      })),
    selectedStepIndex,
    setSelectedStepIndex,
    selectedStep,
    updateStep,
    addStep,
    addSummaryStep,
    removeStep,
    moveStep,
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
