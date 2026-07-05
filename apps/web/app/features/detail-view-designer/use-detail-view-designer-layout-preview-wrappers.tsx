import { useCallback, useMemo, type ReactNode } from "react";
import { entityCardViewAdapter } from "@repo/ui-builder-react";
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

import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
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
  type ComponentsLayoutBinding,
} from "../form-designer/form-designer-components-layout";
import {
  resolvePreviewColumnChromeProps,
  resolvePreviewRowFocusState,
} from "../form-designer/preview-focus-state";
import { resolveRowNodeDisplayLabel } from "../form-designer/form-designer-structure-tree";
import { resolveLayoutBinding } from "./detail-view-designer-layout-binding";
import { useDetailViewDesigner } from "./detail-view-designer-context";
import { useOptionalDetailViewDesignerStructureSession } from "./DetailViewDesignerStructureSession";

interface DetailViewDesignerLayoutPreviewRendererProps {
  readonly rowWrapper?: RowWrapper;
  readonly rootColumnWrapper?: RootColumnWrapper;
  readonly nestedColumnWrapper?: NestedColumnWrapper;
}

function useLayoutPreviewBinding(): ComponentsLayoutBinding {
  const { editor } = useDetailViewDesigner();
  return useMemo(() => resolveLayoutBinding(editor), [editor]);
}

export function useDetailViewDesignerLayoutPreviewWrappers(
  enabled: boolean,
): DetailViewDesignerLayoutPreviewRendererProps | undefined {
  const { t } = useTranslation("common");
  const {
    editor,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    requestCloseStructurePanel,
    selectedStructureRowRef,
  } = useDetailViewDesigner();
  const structureSession = useOptionalDetailViewDesignerStructureSession();
  const { getDefinition, items } = useEntityCatalog();
  const definition = useEntityDefinition(editor.entityName);
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const binding = useLayoutPreviewBinding();

  const fieldDescriptors = useMemo(
    () =>
      entityCardViewAdapter(definition, getDefinition, items).fieldDescriptors,
    [definition, getDefinition, items],
  );

  const previewRowFocus = structureSession?.previewRowFocus ?? null;
  const previewColumnFocus = structureSession?.previewColumnFocus ?? null;
  const focusedRow = structureSession?.focusedRow ?? null;
  const hoverRow = structureSession?.hoverRow;
  const hoverColumn = structureSession?.hoverColumn;

  const resolveRowLabel = useCallback(
    (row: RowNode) =>
      resolveRowNodeDisplayLabel(row, fieldDescriptors, labels.tree),
    [fieldDescriptors, labels.tree],
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

  const rowWrapper = useCallback<RowWrapper>(
    (row, locator, children) => {
      const rowRef = toComponentRowRef(row.id, locator);

      return (
        <FormDesignerComponentRowChrome
          rowRef={rowRef}
          row={row}
          layout={binding.layout}
          focusState={resolvePreviewRowFocusState(
            binding.layout,
            rowRef,
            previewRowFocus,
            previewColumnFocus,
          )}
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
      binding.layout,
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

  if (!enabled || !structureSession) {
    return undefined;
  }

  return {
    rowWrapper,
    rootColumnWrapper,
    nestedColumnWrapper,
  };
}
