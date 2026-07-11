import { useMemo, useRef } from "react";
import { Form } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import type { WizardStepHostComponentConfig } from "@repo/ui-builder-core";
import { useTranslation } from "react-i18next";

import { WizardStepHost } from "../../components/forms/WizardStepHost";
import {
  clampComponentsStepIndex,
  findRowByRef,
  resolveColumnRefDisplayLabel,
  resolveComponentsLayoutBinding,
} from "./form-designer-components-layout";
import { formDesignerComponentsLabels } from "./form-designer-components-labels";
import { resolveRowNodeDisplayLabel } from "./form-designer-structure-tree";
import {
  LayoutStructureOverlay,
  type LayoutStructureOverlayAdapters,
} from "./LayoutStructureOverlay";
import { useFormDesignerComponentsSession } from "./FormDesignerComponentsSession";
import { useFormDesigner } from "./form-designer-context";

export function FormDesignerComponentsPreviewBody() {
  const { t } = useTranslation("common");
  const {
    editor,
    preview,
    requestComponentRowPanel,
    requestComponentColumnPanel,
  } = useFormDesigner();
  const {
    treeScope,
    stepIndex,
    previewRowFocus,
    previewColumnFocus,
    hoverRow,
    hoverColumn,
    setFocusedRow,
    setFocusedColumn,
    setSelectedRow,
    setSelectedColumn,
    clearColumnHover,
    clearRowHover,
  } = useFormDesignerComponentsSession();
  const frameRef = useRef<HTMLDivElement>(null);

  const clampedStepIndex = clampComponentsStepIndex(
    stepIndex,
    editor.wizard.steps.length,
  );

  const binding = useMemo(
    () => resolveComponentsLayoutBinding(editor, treeScope, clampedStepIndex),
    [clampedStepIndex, editor, treeScope],
  );

  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);

  const adapters = useMemo((): LayoutStructureOverlayAdapters => {
    return {
      focusedRowId: previewRowFocus?.rowId ?? null,
      focusedColumnRef: previewColumnFocus,
      onHoverRow: hoverRow,
      onHoverColumn: hoverColumn,
      onSelectRow: (rowRef) => {
        const row = findRowByRef(binding.layout, rowRef);
        const label = row
          ? resolveRowNodeDisplayLabel(row, [], labels.tree)
          : rowRef.rowId;
        clearColumnHover();
        setFocusedRow(rowRef);
        setSelectedRow(rowRef);
        requestComponentRowPanel(rowRef, label, {
          treeScope,
          stepIndex: clampedStepIndex,
        });
      },
      onSelectColumn: (columnRef) => {
        const label = resolveColumnRefDisplayLabel(
          binding.layout,
          columnRef,
          labels.tree,
        );
        clearRowHover();
        setFocusedColumn(columnRef);
        setSelectedColumn(columnRef);
        requestComponentColumnPanel(columnRef, label, {
          treeScope,
          stepIndex: clampedStepIndex,
        });
      },
      captureClicks: false,
    };
  }, [
    binding.layout,
    clearColumnHover,
    clearRowHover,
    clampedStepIndex,
    hoverColumn,
    hoverRow,
    labels.tree,
    previewColumnFocus,
    previewRowFocus?.rowId,
    requestComponentColumnPanel,
    requestComponentRowPanel,
    setFocusedColumn,
    setFocusedRow,
    setSelectedColumn,
    setSelectedRow,
    treeScope,
  ]);

  const activeStepLayout = editor.wizard.steps[clampedStepIndex]?.layout;

  const componentsWizardPreviewContext = useMemo(() => {
    if (treeScope !== "shell") {
      return preview.wizardPreviewContext;
    }

    return {
      ...preview.wizardPreviewContext,
      wizardStepHostRenderer: (config: WizardStepHostComponentConfig) =>
        activeStepLayout ? (
          <WizardStepHost config={config}>
            <RecursiveLayoutRenderer
              layout={activeStepLayout}
              context={preview.wizardStepPreviewContext}
              renderEmptyRootColumns
            />
          </WizardStepHost>
        ) : null,
    };
  }, [
    activeStepLayout,
    preview.wizardPreviewContext,
    preview.wizardStepPreviewContext,
    treeScope,
  ]);

  const previewContext = useMemo(() => {
    if (treeScope === "footer") {
      return editor.presentation === "wizard"
        ? preview.wizardFooterContext
        : preview.plainFooterContext;
    }

    if (editor.presentation === "wizard") {
      if (treeScope === "step") {
        return preview.wizardStepPreviewContext;
      }

      return componentsWizardPreviewContext;
    }

    return preview.plainPreviewContext;
  }, [
    componentsWizardPreviewContext,
    editor.presentation,
    preview.plainFooterContext,
    preview.plainPreviewContext,
    preview.wizardFooterContext,
    preview.wizardStepPreviewContext,
    treeScope,
  ]);

  return (
    <LayoutStructureOverlay
      frameRef={frameRef}
      layout={binding.layout}
      enabled
      adapters={adapters}
      className="relative w-full"
    >
      <Form className="flex w-full flex-col gap-0">
        <RecursiveLayoutRenderer
          layout={binding.layout}
          context={previewContext}
          renderEmptyRootColumns
          stretchRootColumns={false}
        />
      </Form>
    </LayoutStructureOverlay>
  );
}
