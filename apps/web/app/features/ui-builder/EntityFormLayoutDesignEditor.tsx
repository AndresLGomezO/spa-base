import { useCallback, useMemo, useState } from "react";
import { motionPresetEditorLabels } from "./ui-builder-motion-labels.js";
import { useTranslation } from "react-i18next";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import type {
  WizardActionsComponentConfig,
  WizardProgressComponentConfig,
  WizardStepHostComponentConfig,
  WizardStepStatusKind,
} from "@repo/ui-builder-core";
import {
  Button,
  Checkbox,
  Form,
  Input,
  SegmentedSwitch,
  Text,
  type SegmentedSwitchOption,
} from "@repo/ui";
import { buildInitialValues } from "@repo/ui-builder";
import {
  resolveEffectiveFormModalContentPadding,
  type FormModalSize,
} from "@repo/entities";

import type { EntityName } from "../../entities/entity-catalog";
import { CollapsibleSection } from "../../components/CollapsibleSection.js";
import { FormModal } from "../../components/forms/FormModal";
import { resolveEntityFormModalFooter } from "../../components/entity/use-entity-form-modal-footer";
import { WizardActions } from "../../components/forms/WizardActions";
import { WizardProgress } from "../../components/forms/WizardProgress";
import { WizardStepHost } from "../../components/forms/WizardStepHost";
import { EntityCardLayoutBuilder } from "./EntityCardLayoutBuilder";
import { DesignLayoutEditorShell } from "./DesignLayoutEditorShell";
import { createEntityFormRenderContext } from "./create-entity-form-render-context";
import {
  useEntityFormLayoutEditor,
  type UseEntityFormLayoutEditorResult,
} from "./use-entity-form-layout-editor";

interface EntityFormLayoutDesignEditorProps {
  readonly entityName: EntityName;
  readonly editor?: UseEntityFormLayoutEditorResult;
}

export function EntityFormLayoutDesignEditor({
  entityName,
  editor: editorProp,
}: EntityFormLayoutDesignEditorProps) {
  const { t, i18n } = useTranslation("common");
  const internalEditor = useEntityFormLayoutEditor(entityName);
  const editor = editorProp ?? internalEditor;
  const [previewStepIndex, setPreviewStepIndex] = useState(0);
  const [previewStepStatus, setPreviewStepStatus] =
    useState<WizardStepStatusKind>("active");

  const [values, setValues] = useState(() =>
    buildInitialValues(editor.definition, "create"),
  );
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const usesDesignedModalFooter =
    editor.modalFooterLayout != null ||
    editor.modalChrome.showHeader === false ||
    editor.modalChrome.contentPadding === "none";

  const previewContentPadding = useMemo(
    () => resolveEffectiveFormModalContentPadding(editor.modalChrome),
    [editor.modalChrome],
  );

  const modalSizeOptions = useMemo(
    (): readonly SegmentedSwitchOption<FormModalSize>[] => [
      {
        value: "sm",
        label: t("designLayout.formModalSizeSm"),
        ariaLabel: t("designLayout.formModalSizeSm"),
      },
      {
        value: "md",
        label: t("designLayout.formModalSizeMd"),
        ariaLabel: t("designLayout.formModalSizeMd"),
      },
      {
        value: "lg",
        label: t("designLayout.formModalSizeLg"),
        ariaLabel: t("designLayout.formModalSizeLg"),
      },
      {
        value: "xl",
        label: t("designLayout.formModalSizeXl"),
        ariaLabel: t("designLayout.formModalSizeXl"),
      },
      {
        value: "2xl",
        label: t("designLayout.formModalSize2xl"),
        ariaLabel: t("designLayout.formModalSize2xl"),
      },
    ],
    [t],
  );

  const presentationOptions = useMemo(
    (): readonly SegmentedSwitchOption<"plain" | "wizard">[] => [
      {
        value: "plain",
        label: t("designLayout.formPresentationPlain"),
        ariaLabel: t("designLayout.formPresentationPlain"),
      },
      {
        value: "wizard",
        label: t("designLayout.formPresentationWizard"),
        ariaLabel: t("designLayout.formPresentationWizard"),
      },
    ],
    [t],
  );

  const structureLabels = useMemo(
    () => ({
      structure: t("entity.viewSettings.structure"),
      layoutColumns: t("entity.viewSettings.layoutColumns"),
      showActions: t("entity.viewSettings.showActions"),
      columnStyles: t("entity.viewSettings.columnStyles"),
      stackDirection: {
        title: t("entity.viewSettings.stackDirection"),
        vertical: t("entity.viewSettings.stackVertical"),
        horizontal: t("entity.viewSettings.stackHorizontal"),
      },
      styleRules: {
        addStyleRule: t("entity.viewSettings.addStyleRule"),
        removeStyleRule: t("entity.viewSettings.removeStyleRule"),
        styleProperty: t("entity.viewSettings.styleProperty"),
        styleValue: t("entity.viewSettings.styleValue"),
        styleColorTheme: t("entity.viewSettings.styleColorTheme"),
        styleColorCustom: t("entity.viewSettings.styleColorCustom"),
        styleColorThemeTokens: t("entity.viewSettings.styleColorThemeTokens"),
        styleColorSemanticTokens: t(
          "entity.viewSettings.styleColorSemanticTokens",
        ),
        styleColorCustomInput: t("entity.viewSettings.styleColorCustomInput"),
        styleColorInvalid: t("entity.viewSettings.styleColorInvalid"),
      },
      motion: motionPresetEditorLabels(t),
      layoutEffects: t("entity.viewSettings.layoutEffects"),
      rowStyles: t("entity.viewSettings.rowStyles"),
      rowEffects: t("entity.viewSettings.rowEffects"),
      columnTab: (column: number) =>
        t("entity.viewSettings.columnTab", { column }),
      columnWidthPercent: t("entity.viewSettings.columnWidthPercent"),
      columnWidthAutoHint: (percent: number) =>
        t("entity.viewSettings.columnWidthAutoHint", { percent }),
      moveColumnLeft: t("entity.viewSettings.moveColumnLeft"),
      moveColumnRight: t("entity.viewSettings.moveColumnRight"),
      deleteColumn: (column: number) =>
        t("entity.viewSettings.deleteColumn", { column }),
      addRow: t("entity.viewSettings.addSlot"),
      componentRow: t("entity.viewSettings.component"),
      nestedRow: t("entity.viewSettings.slotColumns"),
      emptyColumn: t("entity.viewSettings.emptyColumn"),
      moveUp: t("entity.viewSettings.moveSlotUp"),
      moveDown: t("entity.viewSettings.moveSlotDown"),
      deleteRow: t("entity.viewSettings.deleteSlot"),
      componentEditor: {
        component: t("entity.viewSettings.component"),
        staticValue: t("entity.viewSettings.staticValue"),
        field: t("entity.viewSettings.field"),
        fallbacks: t("entity.viewSettings.fallbacks"),
        remove: t("entity.viewSettings.remove"),
        addFallback: t("entity.viewSettings.addFallback"),
        slotSettings: t("entity.viewSettings.slotSettings"),
        componentStyles: t("entity.viewSettings.componentStyles"),
        badgeColorRules: t("entity.viewSettings.badgeColorRules"),
        matchValue: t("entity.viewSettings.matchValue"),
        addRule: t("entity.viewSettings.addRule"),
        imageSize: t("entity.viewSettings.imageSize"),
        dateDisplayFormat: t("entity.viewSettings.dateDisplayFormat"),
        displayFormat: t("entity.viewSettings.displayFormat"),
        showCurrency: t("entity.viewSettings.showCurrency"),
        showToneColors: t("entity.viewSettings.showToneColors"),
        entityFieldSelectorLayout: t(
          "entity.viewSettings.entityFieldSelectorLayout",
        ),
        entityFieldSelectorLayoutList: t(
          "entity.viewSettings.entityFieldSelectorLayoutList",
        ),
        entityFieldSelectorLayoutListWithLogo: t(
          "entity.viewSettings.entityFieldSelectorLayoutListWithLogo",
        ),
        entityFieldSelectorLayoutMiniCards: t(
          "entity.viewSettings.entityFieldSelectorLayoutMiniCards",
        ),
        entityFieldSelectorEnableSearch: t(
          "entity.viewSettings.entityFieldSelectorEnableSearch",
        ),
        entityFieldSelectorCardsPerRow: t(
          "entity.viewSettings.entityFieldSelectorCardsPerRow",
        ),
        entityFieldSelectorImageField: t(
          "entity.viewSettings.entityFieldSelectorImageField",
        ),
        entityFieldSelectorImageFieldAuto: t(
          "entity.viewSettings.entityFieldSelectorImageFieldAuto",
        ),
        entityFieldSelectorEnumLayoutHint: t(
          "entity.viewSettings.entityFieldSelectorEnumLayoutHint",
        ),
        booleanFieldDisplay: t("entity.viewSettings.booleanFieldDisplay"),
        booleanFieldDisplayCheckbox: t(
          "entity.viewSettings.booleanFieldDisplayCheckbox",
        ),
        booleanFieldDisplaySwitch: t(
          "entity.viewSettings.booleanFieldDisplaySwitch",
        ),
        booleanFieldSwitchVariant: t(
          "entity.viewSettings.booleanFieldSwitchVariant",
        ),
        booleanFieldSwitchVariantIos: t(
          "entity.viewSettings.booleanFieldSwitchVariantIos",
        ),
        booleanFieldSwitchVariantSquared: t(
          "entity.viewSettings.booleanFieldSwitchVariantSquared",
        ),
        booleanFieldSwitchWidth: t(
          "entity.viewSettings.booleanFieldSwitchWidth",
        ),
        booleanFieldSwitchHeight: t(
          "entity.viewSettings.booleanFieldSwitchHeight",
        ),
        styleRules: {
          addStyleRule: t("entity.viewSettings.addStyleRule"),
          removeStyleRule: t("entity.viewSettings.removeStyleRule"),
          styleProperty: t("entity.viewSettings.styleProperty"),
          styleValue: t("entity.viewSettings.styleValue"),
          styleColorTheme: t("entity.viewSettings.styleColorTheme"),
          styleColorCustom: t("entity.viewSettings.styleColorCustom"),
          styleColorThemeTokens: t("entity.viewSettings.styleColorThemeTokens"),
          styleColorSemanticTokens: t(
            "entity.viewSettings.styleColorSemanticTokens",
          ),
          styleColorCustomInput: t("entity.viewSettings.styleColorCustomInput"),
          styleColorInvalid: t("entity.viewSettings.styleColorInvalid"),
        },
        label: {
          showLabel: t("entity.viewSettings.showLabel"),
          label: t("entity.viewSettings.label"),
          labelPosition: t("entity.viewSettings.labelPosition"),
          labelAbove: t("entity.viewSettings.labelAbove"),
          labelBelow: t("entity.viewSettings.labelBelow"),
          labelAlignLeft: t("entity.viewSettings.labelAlignLeft"),
          labelAlignCenter: t("entity.viewSettings.labelAlignCenter"),
          labelAlignRight: t("entity.viewSettings.labelAlignRight"),
          labelColor: t("entity.viewSettings.labelColor"),
        },
      },
    }),
    [t],
  );

  const previewStep = editor.wizard.steps[previewStepIndex];

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
        onChange: (name, value) =>
          setValues((current) => ({ ...current, [name]: value })),
        onCancel: () => undefined,
        hideActions: usesDesignedModalFooter,
        cancelLabel: t("entity.cancel"),
        saveLabel: t("entity.create"),
      }),
    [
      editor.definition,
      entityName,
      i18n.language,
      t,
      usesDesignedModalFooter,
      values,
    ],
  );

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
        onChange: (name, value) =>
          setValues((current) => ({ ...current, [name]: value })),
        onCancel: () => undefined,
        hideActions: usesDesignedModalFooter,
        cancelLabel: t("entity.cancel"),
        saveLabel: t("entity.create"),
        wizardStepContent: true,
      }),
    [
      editor.definition,
      entityName,
      i18n.language,
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
      }),
    [editor.definition, entityName, i18n.language, t, values],
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
    const baseContext = plainPreviewContext;
    const activeStepLayout = previewStep?.layout;
    return {
      ...baseContext,
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

  const wizardPreviewControls =
    editor.presentation === "wizard" ? (
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {t("designLayout.wizardPreviewStep")}
          </span>
          <select
            className="border-border bg-background rounded-md border px-2 py-1 text-sm"
            value={previewStepIndex}
            onChange={(event) =>
              setPreviewStepIndex(Number(event.target.value))
            }
          >
            {editor.wizard.steps.map((step, index) => (
              <option key={step.id} value={index}>
                {step.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {t("designLayout.wizardPreviewStatus")}
          </span>
          <select
            className="border-border bg-background rounded-md border px-2 py-1 text-sm"
            value={previewStepStatus}
            onChange={(event) =>
              setPreviewStepStatus(event.target.value as WizardStepStatusKind)
            }
          >
            {(["pending", "active", "completed", "invalid"] as const).map(
              (status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
    ) : null;

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

  const preview = (
    <div className="flex flex-col gap-3">
      {wizardPreviewControls}
      <div className="bg-card border-border rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Text className="text-muted-foreground text-sm">
            {t("entity.viewSettings.preview")}
          </Text>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPreviewModalOpen(true)}
          >
            {t("designLayout.openFormPreview")}
          </Button>
        </div>
        <FormModal
          variant="inline"
          open
          scrollable={false}
          onClose={() => undefined}
          title={t("entity.viewSettings.preview")}
          size={editor.modalSize}
          showHeader={editor.modalChrome.showHeader}
          showCloseButton={false}
          contentPadding={previewContentPadding}
          footer={usesDesignedModalFooter ? previewFooter : undefined}
        >
          {formPreviewContent}
        </FormModal>
      </div>
    </div>
  );

  return (
    <>
      <DesignLayoutEditorShell
        preview={preview}
        columnRatio={{ editor: 2, preview: 1 }}
        independentScroll
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">
              {t("designLayout.formModalSize")}
            </span>
            <SegmentedSwitch
              value={editor.modalSize}
              options={modalSizeOptions}
              onChange={(value) => editor.setModalSize(value)}
              ariaLabel={t("designLayout.formModalSize")}
            />
          </label>
          <SegmentedSwitch
            value={editor.presentation}
            options={presentationOptions}
            onChange={(value) => editor.setPresentation(value)}
            ariaLabel={t("designLayout.presentation")}
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={editor.modalChrome.showHeader}
              onChange={(event) =>
                editor.setShowModalHeader(event.target.checked)
              }
            />
            <span>{t("designLayout.formModalShowHeader")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={editor.modalChrome.contentPadding === "none"}
              onChange={(event) =>
                editor.setFlushModalContent(event.target.checked)
              }
            />
            <span>{t("designLayout.formModalFlushContent")}</span>
          </label>
        </div>
        <section className="flex flex-col gap-2">
          <Text className="font-medium">
            {t("designLayout.formModalFooter")}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {t("designLayout.formModalFooterHint")}
          </Text>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={editor.modalFooterLayout != null}
              onChange={(event) => {
                if (event.target.checked) {
                  editor.enableModalFooterLayout();
                } else {
                  editor.disableModalFooterLayout();
                }
              }}
            />
            <span>{t("designLayout.formModalFooterDedicated")}</span>
          </label>
          {editor.modalFooterLayout ? (
            <EntityCardLayoutBuilder
              key={`footer-${editor.layoutEditorKey}`}
              layout={editor.modalFooterLayout}
              definition={editor.definition}
              defaultFieldPath={editor.defaultFieldPath}
              onLayoutChange={editor.setModalFooterLayout}
              labels={structureLabels}
              designSurface="formModalFooter"
            />
          ) : null}
        </section>
        {editor.presentation === "plain" ? (
          <EntityCardLayoutBuilder
            key={`plain-${editor.layoutEditorKey}`}
            layout={editor.plainLayout}
            definition={editor.definition}
            defaultFieldPath={editor.defaultFieldPath}
            onLayoutChange={editor.setPlainLayout}
            labels={structureLabels}
            designSurface="formPlain"
          />
        ) : (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <Text className="font-medium">
                {t("designLayout.wizardShell")}
              </Text>
              <Text className="text-muted-foreground text-sm">
                {t("designLayout.wizardShellRequiredHint")}
              </Text>
              <EntityCardLayoutBuilder
                key={`shell-${editor.layoutEditorKey}`}
                layout={editor.wizard.shellLayout}
                definition={editor.definition}
                defaultFieldPath={editor.defaultFieldPath}
                onLayoutChange={editor.setShellLayout}
                labels={structureLabels}
                designSurface="formWizardShell"
                actionsInModalFooter={editor.modalFooterLayout != null}
              />
            </section>
            <CollapsibleSection
              title={t("designLayout.wizardSteps")}
              defaultOpen={false}
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-1">
                  {editor.wizard.steps.map((step, index) => (
                    <Button
                      key={step.id}
                      type="button"
                      variant={
                        editor.selectedStepIndex === index
                          ? "primary"
                          : "outline"
                      }
                      onClick={() => editor.setSelectedStepIndex(index)}
                    >
                      {t("designLayout.wizardStepTab", { step: index + 1 })}
                    </Button>
                  ))}
                </div>

                {editor.selectedStep ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={editor.selectedStepIndex === 0}
                        onClick={() =>
                          editor.moveStep(editor.selectedStepIndex, -1)
                        }
                      >
                        {t("designLayout.moveColumnUp")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          editor.selectedStepIndex >=
                          editor.wizard.steps.length - 1
                        }
                        onClick={() =>
                          editor.moveStep(editor.selectedStepIndex, 1)
                        }
                      >
                        {t("designLayout.moveColumnDown")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={editor.wizard.steps.length <= 1}
                        onClick={() =>
                          editor.removeStep(editor.selectedStepIndex)
                        }
                      >
                        {t("designLayout.removeWizardStep")}
                      </Button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-muted-foreground">
                          {t("designLayout.wizardStepLabel")}
                        </span>
                        <Input
                          value={editor.selectedStep.label}
                          onChange={(event) =>
                            editor.updateStep(editor.selectedStepIndex, {
                              label: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-muted-foreground">
                          {t("designLayout.wizardStepSubtitle")}
                        </span>
                        <Input
                          value={editor.selectedStep.subtitle ?? ""}
                          onChange={(event) =>
                            editor.updateStep(editor.selectedStepIndex, {
                              subtitle: event.target.value || undefined,
                            })
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-muted-foreground">
                          {t("designLayout.wizardStepIcon")}
                        </span>
                        <Input
                          value={editor.selectedStep.icon ?? ""}
                          onChange={(event) =>
                            editor.updateStep(editor.selectedStepIndex, {
                              icon: event.target.value || undefined,
                            })
                          }
                          placeholder="Database"
                        />
                      </label>
                    </div>

                    <EntityCardLayoutBuilder
                      key={`step-${editor.selectedStepIndex}-${editor.layoutEditorKey}`}
                      layout={editor.selectedStep.layout}
                      definition={editor.definition}
                      defaultFieldPath={editor.defaultFieldPath}
                      onLayoutChange={(layout) =>
                        editor.updateStep(editor.selectedStepIndex, { layout })
                      }
                      labels={structureLabels}
                      designSurface="formWizardStep"
                    />
                  </>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  onClick={editor.addStep}
                >
                  {t("designLayout.addWizardStep")}
                </Button>
              </div>
            </CollapsibleSection>
          </div>
        )}
      </DesignLayoutEditorShell>
      <FormModal
        variant="overlay"
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={t("entity.viewSettings.preview")}
        size={editor.modalSize}
        scrollable={previewFormScrollable}
        showHeader={editor.modalChrome.showHeader}
        showCloseButton={editor.modalChrome.showHeader}
        contentPadding={previewContentPadding}
        footer={usesDesignedModalFooter ? previewFooter : undefined}
      >
        {formPreviewContent}
      </FormModal>
    </>
  );
}
