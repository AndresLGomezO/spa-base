import { useCallback, useMemo, type ReactNode } from "react";
import { Form } from "@repo/ui";
import {
  RecursiveLayoutRenderer,
  type NestedColumnWrapper,
  type RootColumnWrapper,
  type RowWrapper,
} from "@repo/ui-builder-renderer";
import { entityFormFieldAdapter } from "@repo/ui-builder-react";
import type {
  ColumnNode,
  WizardStepHostComponentConfig,
  RowNode,
} from "@repo/ui-builder-core";

import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { WizardStepHost } from "../../components/forms/WizardStepHost";
import {
  areComponentRowRefsEqual,
  toComponentRowRef,
} from "./form-designer-component-row-ref";
import type { ComponentColumnRef } from "./form-designer-component-column-ref";
import { componentColumnRefKey } from "./form-designer-component-column-ref";
import { FormDesignerComponentColumnChrome } from "./FormDesignerComponentColumnChrome";
import { FormDesignerComponentRowChrome } from "./FormDesignerComponentRowChrome";
import { useFormDesignerComponentsSession } from "./FormDesignerComponentsSession";
import {
  clampComponentsStepIndex,
  findRowByRef,
  resolveComponentsLayoutBinding,
} from "./form-designer-components-layout";
import { resolveComponentRowLabel } from "./form-designer-structure-tree";
import { formDesignerComponentsLabels } from "./form-designer-components-labels";
import { useFormDesigner } from "./form-designer-context";
import { useTranslation } from "react-i18next";

export function FormDesignerComponentsPreviewBody() {
  const { t } = useTranslation("common");
  const {
    editor,
    preview,
    markComponentsDirty,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    requestCloseComponentRowPanel,
    selectedComponentRowRef,
  } = useFormDesigner();
  const {
    treeScope,
    stepIndex,
    focusedRow,
    previewRowFocus,
    previewColumnFocus,
    setFocusedRow,
    setFocusedColumn,
    setSelectedRow,
    setSelectedColumn,
    clearColumnHover,
    clearRowHover,
  } = useFormDesignerComponentsSession();
  const definition = useEntityDefinition(editor.definition.name);
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);

  const fieldDescriptors = useMemo(
    () => entityFormFieldAdapter(definition).fieldDescriptors,
    [definition],
  );

  const clampedStepIndex = clampComponentsStepIndex(
    stepIndex,
    editor.wizard.steps.length,
  );

  const binding = useMemo(
    () => resolveComponentsLayoutBinding(editor, treeScope, clampedStepIndex),
    [clampedStepIndex, editor, treeScope],
  );

  const resolveRowLabel = useCallback(
    (row: RowNode) => {
      if (row.type === "component") {
        return resolveComponentRowLabel(
          row.component,
          fieldDescriptors,
          labels.tree,
        );
      }

      return labels.tree.nestedLayout(row.columnCount);
    },
    [fieldDescriptors, labels.tree],
  );

  const resolveColumnLabel = useCallback(
    (columnRef: ComponentColumnRef) =>
      labels.tree.column(
        columnRef.nestedColumnIndex != null
          ? columnRef.nestedColumnIndex + 1
          : columnRef.rootColumnIndex + 1,
      ),
    [labels.tree],
  );

  const handleSelectColumn = useCallback(
    (columnRef: ComponentColumnRef) => {
      clearRowHover();
      setFocusedColumn(columnRef);
      setSelectedColumn(columnRef);
      requestComponentColumnPanel(columnRef, resolveColumnLabel(columnRef), {
        treeScope,
        stepIndex: clampedStepIndex,
      });
    },
    [
      clampedStepIndex,
      clearRowHover,
      requestComponentColumnPanel,
      resolveColumnLabel,
      setFocusedColumn,
      setSelectedColumn,
      treeScope,
    ],
  );

  const handleSelectRow = useCallback(
    (rowRef: ReturnType<typeof toComponentRowRef>) => {
      const row = findRowByRef(binding.layout, rowRef);
      const label = row ? resolveRowLabel(row) : rowRef.rowId;
      clearColumnHover();
      setFocusedRow(rowRef);
      setSelectedRow(rowRef);
      requestComponentRowPanel(rowRef, label, {
        treeScope,
        stepIndex: clampedStepIndex,
      });
    },
    [
      binding.layout,
      clampedStepIndex,
      clearColumnHover,
      requestComponentRowPanel,
      resolveRowLabel,
      setFocusedRow,
      setSelectedRow,
      treeScope,
    ],
  );

  const handleDeleteRow = useCallback(
    (rowRef: ReturnType<typeof toComponentRowRef>) => {
      binding.removeRow(rowRef);
      markComponentsDirty();
      if (areComponentRowRefsEqual(selectedComponentRowRef, rowRef)) {
        requestCloseComponentRowPanel();
      }
      if (areComponentRowRefsEqual(focusedRow, rowRef)) {
        clearRowHover();
      }
    },
    [
      binding,
      clearRowHover,
      focusedRow,
      markComponentsDirty,
      requestCloseComponentRowPanel,
      selectedComponentRowRef,
    ],
  );

  const rowWrapper = useCallback<RowWrapper>(
    (row, locator, children) => (
      <FormDesignerComponentRowChrome
        rowRef={toComponentRowRef(row.id, locator)}
        focusedRow={previewRowFocus}
        focusedColumn={previewColumnFocus}
        onSelect={handleSelectRow}
        onDelete={handleDeleteRow}
      >
        {children}
      </FormDesignerComponentRowChrome>
    ),
    [handleDeleteRow, handleSelectRow, previewColumnFocus, previewRowFocus],
  );

  const focusedColumnKey = useMemo(
    () =>
      previewColumnFocus ? componentColumnRefKey(previewColumnFocus) : null,
    [previewColumnFocus],
  );

  const hasPeerColumnFocus = previewColumnFocus != null;

  const rootColumnWrapper = useCallback<RootColumnWrapper>(
    (index, column: ColumnNode, children: ReactNode) => {
      const columnRef: ComponentColumnRef = { rootColumnIndex: index };

      return (
        <FormDesignerComponentColumnChrome
          key={column.id}
          columnRef={columnRef}
          isColumnFocused={
            focusedColumnKey != null &&
            focusedColumnKey === componentColumnRefKey(columnRef)
          }
          hasPeerColumnFocus={hasPeerColumnFocus}
          focusedColumn={previewColumnFocus}
          focusedRow={previewRowFocus}
          onSelect={handleSelectColumn}
        >
          {children}
        </FormDesignerComponentColumnChrome>
      );
    },
    [
      focusedColumnKey,
      handleSelectColumn,
      hasPeerColumnFocus,
      previewColumnFocus,
      previewRowFocus,
    ],
  );

  const nestedColumnWrapper = useCallback<NestedColumnWrapper>(
    (nestedColumnIndex, column, context, children) => {
      const columnRef: ComponentColumnRef = {
        rootColumnIndex: context.rootColumnIndex,
        nestedParentRowId: context.nestedParentRowId,
        nestedColumnIndex,
      };

      return (
        <FormDesignerComponentColumnChrome
          key={column.id}
          columnRef={columnRef}
          isColumnFocused={
            focusedColumnKey != null &&
            focusedColumnKey === componentColumnRefKey(columnRef)
          }
          hasPeerColumnFocus={hasPeerColumnFocus}
          focusedColumn={previewColumnFocus}
          focusedRow={previewRowFocus}
          onSelect={handleSelectColumn}
        >
          {children}
        </FormDesignerComponentColumnChrome>
      );
    },
    [
      focusedColumnKey,
      handleSelectColumn,
      hasPeerColumnFocus,
      previewColumnFocus,
      previewRowFocus,
    ],
  );

  const rendererProps = useMemo(
    () => ({
      rowWrapper,
      rootColumnWrapper,
      nestedColumnWrapper,
      renderEmptyRootColumns: true,
      stretchRootColumns: false,
    }),
    [nestedColumnWrapper, rootColumnWrapper, rowWrapper],
  );

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
              {...rendererProps}
            />
          </WizardStepHost>
        ) : null,
    };
  }, [
    activeStepLayout,
    preview.wizardPreviewContext,
    preview.wizardStepPreviewContext,
    rendererProps,
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
    <div className="w-full">
      <Form className="flex w-full flex-col gap-0">
        <RecursiveLayoutRenderer
          layout={binding.layout}
          context={previewContext}
          {...rendererProps}
        />
      </Form>
    </div>
  );
}
