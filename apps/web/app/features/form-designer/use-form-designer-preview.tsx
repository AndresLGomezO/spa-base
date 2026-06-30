import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import type {
  WizardActionsComponentConfig,
  WizardProgressComponentConfig,
  WizardStepHostComponentConfig,
  WizardStepStatusKind,
} from "@repo/ui-builder-core";
import { Form } from "@repo/ui";
import { buildInitialValuesFromLayout } from "@repo/entities";
import {
  resolveEffectiveFormModalContentPadding,
  type FormModalPreviewBreakpoint,
} from "@repo/entities";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { applyFormFieldChange } from "../../components/entity/form-relation-display-cache";
import { resolveEntityFormModalFooter } from "../../components/entity/use-entity-form-modal-footer";
import { WizardActions } from "../../components/forms/WizardActions";
import { WizardProgress } from "../../components/forms/WizardProgress";
import { WizardStepHost } from "../../components/forms/WizardStepHost";
import { createEntityFormRenderContext } from "../ui-builder/create-entity-form-render-context";
import type { UseEntityFormLayoutEditorResult } from "../ui-builder/use-entity-form-layout-editor";

export type UseFormDesignerPreviewResult = ReturnType<
  typeof useFormDesignerPreview
>;

export function useFormDesignerPreview(
  editor: UseEntityFormLayoutEditorResult,
  previewBreakpoint: FormModalPreviewBreakpoint,
) {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { getDefinition } = useEntityCatalog();
  const entityName = editor.entityName;

  const [values, setValues] = useState(() =>
    buildInitialValuesFromLayout(editor.definition, "create"),
  );
  const [previewStepIndex, setPreviewStepIndex] = useState(0);
  const [previewStepStatus] = useState<WizardStepStatusKind>("active");

  const usesDesignedModalFooter =
    editor.modalFooterLayout != null ||
    editor.modalChrome.showHeader === false ||
    editor.modalChrome.contentPadding === "none";

  const previewContentPadding = useMemo(
    () => resolveEffectiveFormModalContentPadding(editor.modalChrome),
    [editor.modalChrome],
  );

  const previewWizardStepNext = useCallback(
    () =>
      setPreviewStepIndex((index) =>
        Math.min(index + 1, editor.wizard.steps.length - 1),
      ),
    [editor.wizard.steps.length],
  );

  const previewWizardStepBack = useCallback(
    () => setPreviewStepIndex((index) => Math.max(0, index - 1)),
    [],
  );

  const previewWizardStepCancel = useCallback(() => undefined, []);

  const handlePreviewFieldChange = useCallback(
    (
      fieldName: string,
      value: unknown,
      displayRecord?: Record<string, unknown> | null,
    ) => {
      setValues((current) =>
        applyFormFieldChange(
          editor.definition,
          current,
          fieldName,
          value,
          displayRecord,
        ),
      );
    },
    [editor.definition],
  );

  const plainPreviewContext = useMemo(
    () =>
      createEntityFormRenderContext({
        entityName,
        definition: editor.definition,
        locale: i18n.language,
        mode: "create",
        values,
        errors: {},
        fieldAccess: {},
        canRead: true,
        canWrite: true,
        onChange: handlePreviewFieldChange,
        onCancel: () => undefined,
        hideActions: usesDesignedModalFooter,
        cancelLabel: t("entity.cancel"),
        saveLabel: t("entity.create"),
        getDefinition,
        navigate,
      }),
    [
      editor.definition,
      entityName,
      getDefinition,
      handlePreviewFieldChange,
      i18n.language,
      navigate,
      t,
      usesDesignedModalFooter,
      values,
    ],
  );

  const previewStep = editor.wizard.steps[previewStepIndex];

  const wizardStepPreviewContext = useMemo(
    () =>
      createEntityFormRenderContext({
        entityName,
        definition: editor.definition,
        locale: i18n.language,
        mode: "create",
        values,
        errors: {},
        fieldAccess: {},
        canRead: true,
        canWrite: true,
        onChange: handlePreviewFieldChange,
        onCancel: () => undefined,
        hideActions: usesDesignedModalFooter,
        cancelLabel: t("entity.cancel"),
        saveLabel: t("entity.create"),
        wizardStepContent: true,
        getDefinition,
        navigate,
        usePreviewSamples: true,
      }),
    [
      editor.definition,
      entityName,
      getDefinition,
      handlePreviewFieldChange,
      i18n.language,
      navigate,
      t,
      usesDesignedModalFooter,
      values,
    ],
  );

  const plainFooterContext = useMemo(
    () =>
      createEntityFormRenderContext({
        entityName,
        definition: editor.definition,
        locale: i18n.language,
        mode: "create",
        values,
        errors: {},
        fieldAccess: {},
        canRead: true,
        canWrite: true,
        onChange: (name, value) =>
          setValues((current) => ({ ...current, [name]: value })),
        onCancel: () => undefined,
        hideActions: false,
        cancelLabel: t("entity.cancel"),
        saveLabel: t("entity.create"),
        navigate,
      }),
    [editor.definition, entityName, i18n.language, navigate, t, values],
  );

  const wizardPreviewState = useMemo(() => {
    const stepStatuses: Record<string, WizardStepStatusKind> = {};
    for (const [index, step] of editor.wizard.steps.entries()) {
      if (index < previewStepIndex) {
        stepStatuses[step.id] = "completed";
      } else if (index === previewStepIndex) {
        stepStatuses[step.id] = previewStepStatus;
      } else {
        stepStatuses[step.id] = "pending";
      }
    }
    return {
      steps: editor.wizard.steps.map((step) => ({
        id: step.id,
        label: step.label,
        subtitle: step.subtitle,
        icon: step.icon,
      })),
      currentStepIndex: previewStepIndex,
      stepStatuses,
    };
  }, [editor.wizard.steps, previewStepIndex, previewStepStatus]);

  const wizardPreviewContext = useMemo(() => {
    const activeStepLayout = previewStep?.layout;
    return {
      ...plainPreviewContext,
      wizard: wizardPreviewState,
      wizardProgressRenderer: (config: WizardProgressComponentConfig) => (
        <WizardProgress config={config} wizard={wizardPreviewState} />
      ),
      wizardStepHostRenderer: (config: WizardStepHostComponentConfig) =>
        activeStepLayout ? (
          <WizardStepHost config={config}>
            <RecursiveLayoutRenderer
              layout={activeStepLayout}
              context={wizardStepPreviewContext}
            />
          </WizardStepHost>
        ) : null,
      wizardActionsRenderer: (config: WizardActionsComponentConfig) => (
        <WizardActions
          config={config}
          mode="create"
          currentStepIndex={previewStepIndex}
          totalSteps={editor.wizard.steps.length}
          isCurrentStepValid
          hideActions={!usesDesignedModalFooter}
          onNext={previewWizardStepNext}
          onBack={previewWizardStepBack}
          onCancel={previewWizardStepCancel}
          onSubmit={() => {}}
        />
      ),
    };
  }, [
    editor.wizard.steps.length,
    plainPreviewContext,
    previewStep?.layout,
    previewStepIndex,
    wizardStepPreviewContext,
    previewWizardStepBack,
    previewWizardStepCancel,
    previewWizardStepNext,
    usesDesignedModalFooter,
    wizardPreviewState,
  ]);

  const wizardFooterContext = useMemo(
    () => ({
      ...wizardPreviewContext,
      wizardActionsRenderer: (config: WizardActionsComponentConfig) => (
        <WizardActions
          config={config}
          mode="create"
          currentStepIndex={previewStepIndex}
          totalSteps={editor.wizard.steps.length}
          isCurrentStepValid
          hideActions={false}
          onNext={previewWizardStepNext}
          onBack={previewWizardStepBack}
          onCancel={previewWizardStepCancel}
          onSubmit={() => {}}
        />
      ),
    }),
    [
      editor.wizard.steps.length,
      previewStepIndex,
      previewWizardStepBack,
      previewWizardStepCancel,
      previewWizardStepNext,
      wizardPreviewContext,
    ],
  );

  const previewFooter = useMemo(
    () =>
      resolveEntityFormModalFooter({
        enabled: usesDesignedModalFooter,
        modalFooterLayout: editor.modalFooterLayout,
        fallbackLayout:
          editor.presentation === "wizard"
            ? editor.wizard.shellLayout
            : editor.plainLayout,
        footerContext:
          editor.presentation === "wizard"
            ? wizardFooterContext
            : plainFooterContext,
        wizardMode: editor.presentation === "wizard" ? "create" : undefined,
        wizardCurrentStepIndex:
          editor.presentation === "wizard" ? previewStepIndex : undefined,
        wizardTotalSteps:
          editor.presentation === "wizard"
            ? editor.wizard.steps.length
            : undefined,
        wizardOnNext:
          editor.presentation === "wizard" ? previewWizardStepNext : undefined,
        wizardOnBack:
          editor.presentation === "wizard" ? previewWizardStepBack : undefined,
        wizardOnCancel:
          editor.presentation === "wizard"
            ? previewWizardStepCancel
            : undefined,
        wizardIsCurrentStepValid:
          editor.presentation === "wizard" ? true : undefined,
        wizardOnSubmit: editor.presentation === "wizard" ? () => {} : undefined,
      }),
    [
      editor.modalFooterLayout,
      editor.plainLayout,
      editor.presentation,
      editor.wizard.shellLayout,
      editor.wizard.steps.length,
      plainFooterContext,
      previewStepIndex,
      previewWizardStepBack,
      previewWizardStepCancel,
      previewWizardStepNext,
      usesDesignedModalFooter,
      wizardFooterContext,
    ],
  );

  const formPreviewBody =
    editor.presentation === "wizard" ? (
      <RecursiveLayoutRenderer
        layout={editor.wizard.shellLayout}
        context={wizardPreviewContext}
      />
    ) : (
      <RecursiveLayoutRenderer
        layout={editor.plainLayout}
        context={plainPreviewContext}
      />
    );

  const previewFormScrollable =
    editor.presentation !== "wizard" && previewContentPadding !== "none";

  const formPreviewContent = (
    <div className="w-full">
      <Form className="flex w-full flex-col gap-0">{formPreviewBody}</Form>
    </div>
  );

  return {
    previewContentPadding,
    previewFooter,
    formPreviewContent,
    previewFormScrollable,
    modalSize: editor.getResolvedModalSizeAtBreakpoint(previewBreakpoint),
    showHeader: editor.modalChrome.showHeader ?? true,
    usesDesignedModalFooter,
    plainPreviewContext,
    plainFooterContext,
    wizardPreviewContext,
    wizardStepPreviewContext,
    wizardFooterContext,
  };
}
