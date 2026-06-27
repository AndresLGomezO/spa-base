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
import {
  areComponentRowRefsEqual,
  toComponentRowRef,
} from "../form-designer/form-designer-component-row-ref";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import {
  findRowByRef,
  isStructuralPreviewRow,
  resolveColumnRefDisplayLabel,
  resolvePreviewColumnChromeProps,
  resolvePreviewRowFocusState,
  type ComponentsLayoutBinding,
} from "../form-designer/form-designer-components-layout";
import { resolveRowNodeDisplayLabel } from "../form-designer/form-designer-structure-tree";
import { resolveActiveLayoutBinding } from "./dashboard-layout-designer-layout-binding";
import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import { useOptionalDashboardLayoutDesignerStructureSession } from "./DashboardLayoutDesignerStructureSession";

interface DashboardLayoutDesignerLayoutPreviewRendererProps {
  readonly rowWrapper?: RowWrapper;
  readonly rootColumnWrapper?: RootColumnWrapper;
  readonly nestedColumnWrapper?: NestedColumnWrapper;
}

function useLayoutPreviewBinding(
  editor: ReturnType<typeof useDashboardLayoutDesigner>["editor"],
  activeTabId: ReturnType<typeof useDashboardLayoutDesigner>["activeTabId"],
): ComponentsLayoutBinding | null {
  return useMemo(() => {
    if (activeTabId === "layout") {
      return resolveActiveLayoutBinding(editor, "layout");
    }

    if (!editor.selectedSection) {
      return null;
    }

    return resolveActiveLayoutBinding(editor, "sections");
  }, [activeTabId, editor]);
}

export function useDashboardLayoutDesignerLayoutPreviewWrappers(
  enabled: boolean,
): DashboardLayoutDesignerLayoutPreviewRendererProps | undefined {
  const { t } = useTranslation("common");
  const {
    editor,
    activeTabId,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    requestCloseStructurePanel,
    selectedStructureRowRef,
  } = useDashboardLayoutDesigner();
  const structureSession = useOptionalDashboardLayoutDesignerStructureSession();
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const binding = useLayoutPreviewBinding(editor, activeTabId);

  const previewRowFocus = structureSession?.previewRowFocus ?? null;
  const previewColumnFocus = structureSession?.previewColumnFocus ?? null;
  const focusedRow = structureSession?.focusedRow ?? null;
  const hoverRow = structureSession?.hoverRow;
  const hoverColumn = structureSession?.hoverColumn;

  const resolveRowLabel = useCallback(
    (row: RowNode) => resolveRowNodeDisplayLabel(row, [], labels.tree),
    [labels.tree],
  );

  const resolveColumnLabel = useCallback(
    (columnRef: ComponentColumnRef) => {
      if (!binding) {
        return String(columnRef.rootColumnIndex + 1);
      }

      return resolveColumnRefDisplayLabel(
        binding.layout,
        columnRef,
        labels.tree,
      );
    },
    [binding, labels.tree],
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
      if (!binding) {
        return;
      }

      const row = findRowByRef(binding.layout, rowRef);
      const label = row ? resolveRowLabel(row) : rowRef.rowId;
      structureSession?.clearColumnHover();
      structureSession?.setFocusedRow(rowRef);
      structureSession?.setSelectedRow(rowRef);
      requestComponentRowPanel(rowRef, label);
    },
    [binding, requestComponentRowPanel, resolveRowLabel, structureSession],
  );

  const handleDeleteRow = useCallback(
    (rowRef: ReturnType<typeof toComponentRowRef>) => {
      if (!binding) {
        return;
      }

      const isRootContainer = isRootContainerRow(binding.layout, rowRef.rowId);

      if (isRootContainer) {
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

  const previewLayout = binding?.layout;

  const rowWrapper = useCallback<RowWrapper>(
    (row, locator, children) => {
      const rowRef = toComponentRowRef(row.id, locator);

      return (
        <FormDesignerComponentRowChrome
          rowRef={rowRef}
          row={row}
          layout={previewLayout ?? undefined}
          focusState={
            previewLayout
              ? resolvePreviewRowFocusState(
                  previewLayout,
                  rowRef,
                  previewRowFocus,
                  previewColumnFocus,
                )
              : "none"
          }
          isStructuralRow={isStructuralPreviewRow(row)}
          onHover={hoverRow}
          onSelect={handleSelectRow}
          onDelete={handleDeleteRow}
        >
          {children}
        </FormDesignerComponentRowChrome>
      );
    },
    [
      previewLayout,
      handleDeleteRow,
      handleSelectRow,
      hoverRow,
      previewColumnFocus,
      previewRowFocus,
    ],
  );

  const rootColumnWrapper = useCallback<RootColumnWrapper>(
    (index, column: ColumnNode, children: ReactNode) => {
      const columnRef: ComponentColumnRef = { rootColumnIndex: index };

      return (
        <FormDesignerComponentColumnChrome
          key={column.id}
          columnRef={columnRef}
          {...resolvePreviewColumnChromeProps(
            columnRef,
            previewRowFocus,
            previewColumnFocus,
          )}
          onHover={hoverColumn}
          onSelect={handleSelectColumn}
        >
          {children}
        </FormDesignerComponentColumnChrome>
      );
    },
    [handleSelectColumn, hoverColumn, previewColumnFocus, previewRowFocus],
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
          {...resolvePreviewColumnChromeProps(
            columnRef,
            previewRowFocus,
            previewColumnFocus,
          )}
          onHover={hoverColumn}
          onSelect={handleSelectColumn}
        >
          {children}
        </FormDesignerComponentColumnChrome>
      );
    },
    [handleSelectColumn, hoverColumn, previewColumnFocus, previewRowFocus],
  );

  if (!enabled || !structureSession || !binding) {
    return undefined;
  }

  return {
    rowWrapper,
    rootColumnWrapper,
    nestedColumnWrapper,
  };
}
