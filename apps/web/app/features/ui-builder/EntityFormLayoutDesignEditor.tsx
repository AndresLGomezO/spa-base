import { useMemo, useState } from "react";
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
  Input,
  SegmentedSwitch,
  Text,
  toast,
  type SegmentedSwitchOption,
} from "@repo/ui";
import { buildInitialValues } from "@repo/ui-builder";
import type { FormModalSize } from "@repo/entities";

import type { EntityName } from "../../entities/entity-catalog";
import { WizardActions } from "../../components/forms/WizardActions";
import { WizardProgress } from "../../components/forms/WizardProgress";
import { WizardStepHost } from "../../components/forms/WizardStepHost";
import { EntityCardLayoutBuilder } from "./EntityCardLayoutBuilder";
import { DesignLayoutEditorShell } from "./DesignLayoutEditorShell";
import { DockedLayoutPreview } from "./DockedLayoutPreview";
import { createEntityFormRenderContext } from "./create-entity-form-render-context";
import { useEntityFormLayoutEditor } from "./use-entity-form-layout-editor";

interface EntityFormLayoutDesignEditorProps {
  readonly entityName: EntityName;
  readonly canSave?: boolean;
}

export function EntityFormLayoutDesignEditor({
  entityName,
  canSave = false,
}: EntityFormLayoutDesignEditorProps) {
  const { t, i18n } = useTranslation("common");
  const editor = useEntityFormLayoutEditor(entityName);
  const [previewStepIndex, setPreviewStepIndex] = useState(0);
  const [previewStepStatus, setPreviewStepStatus] =
    useState<WizardStepStatusKind>("active");

  const [values, setValues] = useState(() =>
    buildInitialValues(editor.definition, "create"),
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
      },
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
        styleRules: {
          addStyleRule: t("entity.viewSettings.addStyleRule"),
          removeStyleRule: t("entity.viewSettings.removeStyleRule"),
          styleProperty: t("entity.viewSettings.styleProperty"),
          styleValue: t("entity.viewSettings.styleValue"),
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
        hideActions: true,
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
              context={baseContext}
            />
          </WizardStepHost>
        ) : null,
      wizardActionsRenderer: (config: WizardActionsComponentConfig) => (
        <WizardActions
          config={config}
          mode="create"
          currentStepIndex={previewStepIndex}
          totalSteps={editor.wizard.steps.length}
          hideActions={false}
          onNext={() =>
            setPreviewStepIndex((index) =>
              Math.min(index + 1, editor.wizard.steps.length - 1),
            )
          }
          onBack={() => setPreviewStepIndex((index) => Math.max(0, index - 1))}
          onCancel={() => undefined}
        />
      ),
    };
  }, [
    editor.wizard.steps.length,
    plainPreviewContext,
    previewStep?.layout,
    previewStepIndex,
    wizardPreviewState,
  ]);

  const preview = (
    <DockedLayoutPreview enabled>
      <div className="flex flex-col gap-3">
        {editor.presentation === "wizard" ? (
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
                  setPreviewStepStatus(
                    event.target.value as WizardStepStatusKind,
                  )
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
        ) : null}
        <div className="bg-card border-border rounded-lg border p-4">
          <Text className="text-muted-foreground mb-3 text-sm">
            {t("entity.viewSettings.preview")}
          </Text>
          {editor.presentation === "wizard" ? (
            <RecursiveLayoutRenderer
              layout={editor.wizard.shellLayout}
              context={wizardPreviewContext}
            />
          ) : (
            <RecursiveLayoutRenderer
              layout={editor.plainLayout}
              context={plainPreviewContext}
            />
          )}
        </div>
      </div>
    </DockedLayoutPreview>
  );

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    const saveError = await editor.save();
    if (!saveError) {
      toast.success(t("entity.viewSettings.saved"));
    } else {
      toast.error(saveError);
    }
  };

  return (
    <DesignLayoutEditorShell preview={preview}>
      {canSave ? (
        <div className="flex justify-end">
          <Button
            type="button"
            loading={editor.isSaving}
            onClick={() => void handleSave()}
          >
            {t("entity.viewSettings.save")}
          </Button>
        </div>
      ) : null}
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
      </div>
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
            <Text className="font-medium">{t("designLayout.wizardShell")}</Text>
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
            />
          </section>
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <Text className="font-medium">
                {t("designLayout.wizardSteps")}
              </Text>
              <ul className="flex flex-col gap-2">
                {editor.wizard.steps.map((step, index) => (
                  <li
                    key={step.id}
                    className="border-border flex flex-col gap-2 rounded-md border p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          editor.selectedStepIndex === index
                            ? "primary"
                            : "outline"
                        }
                        onClick={() => editor.setSelectedStepIndex(index)}
                      >
                        {step.label}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={index === 0}
                        onClick={() => editor.moveStep(index, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={index >= editor.wizard.steps.length - 1}
                        onClick={() => editor.moveStep(index, 1)}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={editor.wizard.steps.length <= 1}
                        onClick={() => editor.removeStep(index)}
                      >
                        {t("designLayout.removeWizardStep")}
                      </Button>
                    </div>
                    {editor.selectedStepIndex === index ? (
                      <div className="grid gap-2 sm:grid-cols-3">
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-muted-foreground">
                            {t("designLayout.wizardStepLabel")}
                          </span>
                          <Input
                            value={step.label}
                            onChange={(event) =>
                              editor.updateStep(index, {
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
                            value={step.subtitle ?? ""}
                            onChange={(event) =>
                              editor.updateStep(index, {
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
                            value={step.icon ?? ""}
                            onChange={(event) =>
                              editor.updateStep(index, {
                                icon: event.target.value || undefined,
                              })
                            }
                            placeholder="Database"
                          />
                        </label>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
              <Button type="button" variant="outline" onClick={editor.addStep}>
                {t("designLayout.addWizardStep")}
              </Button>
            </section>
            {editor.selectedStep ? (
              <section className="flex flex-col gap-2">
                <Text className="font-medium">
                  {t("designLayout.wizardStep", {
                    step: editor.selectedStep.label,
                  })}
                </Text>
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
              </section>
            ) : null}
          </div>
        </div>
      )}
    </DesignLayoutEditorShell>
  );
}
