import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createDefaultWizardFormConfig,
  createDefaultWizardStepLayout,
  createLayoutId,
  ensureWizardShellLayout,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import {
  createDefaultFormLayout,
  normalizeEntityViews,
  resolveFormModalSize,
  resolveFormPresentation,
  resolvePlainFormLayout,
  resolveWizardForm,
  type FormModalSize,
  type FormPresentation,
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
  const [plainLayout, setPlainLayout] = useState<UiLayoutDocument>(
    () =>
      resolvePlainFormLayout(definition).layout ??
      createDefaultFormLayout(fieldPaths),
  );
  const [wizard, setWizard] = useState<WizardFormConfig>(() => {
    const initial =
      resolveWizardForm(definition) ??
      createDefaultWizardFormConfig(fieldPaths);
    return {
      ...initial,
      shellLayout: ensureWizardShellLayout(initial.shellLayout),
    };
  });
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [layoutEditorKey, setLayoutEditorKey] = useState(0);

  useEffect(() => {
    setPresentation(resolveFormPresentation(definition));
    setModalSize(resolveFormModalSize(definition));
    const resolvedPlain = resolvePlainFormLayout(definition).layout;
    if (resolvedPlain) {
      setPlainLayout(resolvedPlain);
    } else {
      setPlainLayout(createDefaultFormLayout(fieldPaths));
    }
    const resolvedWizard =
      resolveWizardForm(definition) ??
      createDefaultWizardFormConfig(fieldPaths);
    setWizard({
      ...resolvedWizard,
      shellLayout: ensureWizardShellLayout(resolvedWizard.shellLayout),
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
              shellLayout: ensureWizardShellLayout(wizard.shellLayout),
            }
          : wizard;

      const formsPayload = {
        presentation,
        modalSize,
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
    plainLayout,
    modalSize,
    presentation,
    queryClient,
    wizard,
  ]);

  return {
    entityName,
    definition,
    fieldPaths,
    defaultFieldPath,
    modalSize,
    setModalSize,
    presentation,
    setPresentation,
    plainLayout,
    setPlainLayout,
    wizard,
    setWizard,
    setShellLayout: (shellLayout: UiLayoutDocument) =>
      setWizard((current) => ({
        ...current,
        shellLayout: ensureWizardShellLayout(shellLayout),
      })),
    selectedStepIndex,
    setSelectedStepIndex,
    selectedStep,
    updateStep,
    addStep,
    removeStep,
    moveStep,
    isSaving,
    save,
    layoutEditorKey,
  };
}
