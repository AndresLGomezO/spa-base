import { useCallback, useMemo, type ReactNode } from "react";
import type {
  NestedColumnWrapper,
  RootColumnWrapper,
  RowWrapper,
} from "@repo/ui-builder-renderer";
import {
  isRootContainerRow,
  type ColumnNode,
  type RowNode,
} from "@repo/ui-builder-core";
import { useTranslation } from "react-i18next";

import { FormDesignerComponentColumnChrome } from "../form-designer/FormDesignerComponentColumnChrome";
import { FormDesignerComponentRowChrome } from "../form-designer/FormDesignerComponentRowChrome";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import { componentColumnRefKey } from "../form-designer/form-designer-component-column-ref";
import {
  areComponentRowRefsEqual,
  toComponentRowRef,
} from "../form-designer/form-designer-component-row-ref";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import {
  findRowByRef,
  type ComponentsLayoutBinding,
} from "../form-designer/form-designer-components-layout";
import { resolveComponentRowLabel } from "../form-designer/form-designer-structure-tree";
import { resolveLayoutBinding } from "./main-view-designer-layout-binding";
import { useMainViewDesigner } from "./main-view-designer-context";
import { useOptionalMainViewDesignerStructureSession } from "./MainViewDesignerStructureSession";

interface MainViewDesignerLayoutPreviewRendererProps {
  readonly rowWrapper?: RowWrapper;
  readonly rootColumnWrapper?: RootColumnWrapper;
  readonly nestedColumnWrapper?: NestedColumnWrapper;
}

function useLayoutPreviewBinding(): ComponentsLayoutBinding {
  const { editor } = useMainViewDesigner();
  return useMemo(() => resolveLayoutBinding(editor), [editor]);
}

export function useMainViewDesignerLayoutPreviewWrappers(
  enabled: boolean,
): MainViewDesignerLayoutPreviewRendererProps | undefined {
  const { t } = useTranslation("common");
  const {
    requestComponentRowPanel,
    requestComponentColumnPanel,
    requestCloseStructurePanel,
    selectedStructureRowRef,
  } = useMainViewDesigner();
  const structureSession = useOptionalMainViewDesignerStructureSession();
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const binding = useLayoutPreviewBinding();

  const previewRowFocus = structureSession?.previewRowFocus ?? null;
  const previewColumnFocus = structureSession?.previewColumnFocus ?? null;
  const focusedRow = structureSession?.focusedRow ?? null;

  const resolveRowLabel = useCallback(
    (row: RowNode) => {
      if (row.type === "component") {
        return resolveComponentRowLabel(row.component, [], labels.tree);
      }

      return labels.tree.nestedLayout(row.columnCount);
    },
    [labels.tree],
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
      structureSession?.clearRowHover();
      structureSession?.setFocusedColumn(columnRef);
      structureSession?.setSelectedColumn(columnRef);
      requestComponentColumnPanel(columnRef, resolveColumnLabel(columnRef));
    },
    [requestComponentColumnPanel, resolveColumnLabel, structureSession],
  );

  const handleSelectRow = useCallback(
    (rowRef: ReturnType<typeof toComponentRowRef>) => {
      const row = findRowByRef(binding.layout, rowRef);
      const label = row ? resolveRowLabel(row) : rowRef.rowId;
      structureSession?.clearColumnHover();
      structureSession?.setFocusedRow(rowRef);
      structureSession?.setSelectedRow(rowRef);
      requestComponentRowPanel(rowRef, label);
    },
    [
      binding.layout,
      requestComponentRowPanel,
      resolveRowLabel,
      structureSession,
    ],
  );

  const handleDeleteRow = useCallback(
    (rowRef: ReturnType<typeof toComponentRowRef>) => {
      if (isRootContainerRow(binding.layout, rowRef.rowId)) {
        return;
      }

      binding.removeRow(rowRef);
      if (areComponentRowRefsEqual(selectedStructureRowRef, rowRef)) {
        requestCloseStructurePanel();
      }
      if (areComponentRowRefsEqual(focusedRow, rowRef)) {
        structureSession?.clearRowHover();
      }
    },
    [
      binding,
      focusedRow,
      requestCloseStructurePanel,
      selectedStructureRowRef,
      structureSession,
    ],
  );

  const focusedColumnKey = useMemo(
    () =>
      previewColumnFocus ? componentColumnRefKey(previewColumnFocus) : null,
    [previewColumnFocus],
  );

  const hasPeerColumnFocus = previewColumnFocus != null;

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

  if (!enabled || !structureSession) {
    return undefined;
  }

  return {
    rowWrapper,
    rootColumnWrapper,
    nestedColumnWrapper,
  };
}
