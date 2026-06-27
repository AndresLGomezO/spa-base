import { useCallback, useMemo, type ReactNode } from "react";
import { entityCardViewAdapter } from "@repo/ui-builder-react";
import type {
  NestedColumnWrapper,
  RootColumnWrapper,
  RowWrapper,
} from "@repo/ui-builder-renderer";
import type { ColumnNode, RowNode } from "@repo/ui-builder-core";
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
  resolvePreviewColumnChromeProps,
  resolvePreviewRowFocusState,
  type ComponentsLayoutBinding,
} from "../form-designer/form-designer-components-layout";
import { resolveRowNodeDisplayLabel } from "../form-designer/form-designer-structure-tree";
import { resolveScopeLayoutBinding } from "./item-list-designer-layout-binding";
import type { ItemListStructureScope } from "./item-list-designer-structure-scope";
import { useItemListDesigner } from "./item-list-designer-context";
import { useItemListDesignerStructureSession } from "./ItemListDesignerStructureSession";

interface ItemListDesignerLayoutPreviewRendererProps {
  readonly rowWrapper?: RowWrapper;
  readonly rootColumnWrapper?: RootColumnWrapper;
  readonly nestedColumnWrapper?: NestedColumnWrapper;
}

function useLayoutPreviewBinding(
  scope: ItemListStructureScope,
): ComponentsLayoutBinding {
  const { editor } = useItemListDesigner();
  return useMemo(
    () => resolveScopeLayoutBinding(editor, scope),
    [editor, scope],
  );
}

function useLayoutPreviewWrappers(
  scope: ItemListStructureScope,
  enabled: boolean,
): ItemListDesignerLayoutPreviewRendererProps | undefined {
  const { t } = useTranslation("common");
  const {
    editor,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    requestCloseStructurePanel,
    selectedStructureRowRef,
  } = useItemListDesigner();
  const {
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
    focusedRow,
  } = useItemListDesignerStructureSession();
  const { getDefinition } = useEntityCatalog();
  const definition = useEntityDefinition(editor.entityName);
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const binding = useLayoutPreviewBinding(scope);

  const fieldDescriptors = useMemo(
    () => entityCardViewAdapter(definition, getDefinition).fieldDescriptors,
    [definition, getDefinition],
  );

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
      clearRowHover();
      setFocusedColumn(columnRef);
      setSelectedColumn(columnRef);
      requestComponentColumnPanel(columnRef, resolveColumnLabel(columnRef));
    },
    [
      clearRowHover,
      requestComponentColumnPanel,
      resolveColumnLabel,
      setFocusedColumn,
      setSelectedColumn,
    ],
  );

  const handleSelectRow = useCallback(
    (rowRef: ReturnType<typeof toComponentRowRef>) => {
      const row = findRowByRef(binding.layout, rowRef);
      const label = row ? resolveRowLabel(row) : rowRef.rowId;
      clearColumnHover();
      setFocusedRow(rowRef);
      setSelectedRow(rowRef);
      requestComponentRowPanel(rowRef, label);
    },
    [
      binding.layout,
      clearColumnHover,
      requestComponentRowPanel,
      resolveRowLabel,
      setFocusedRow,
      setSelectedRow,
    ],
  );

  const handleDeleteRow = useCallback(
    (rowRef: ReturnType<typeof toComponentRowRef>) => {
      binding.removeRow(rowRef);
      if (areComponentRowRefsEqual(selectedStructureRowRef, rowRef)) {
        requestCloseStructurePanel();
      }
      if (areComponentRowRefsEqual(focusedRow, rowRef)) {
        clearRowHover();
      }
    },
    [
      binding,
      clearRowHover,
      focusedRow,
      requestCloseStructurePanel,
      selectedStructureRowRef,
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

  if (!enabled) {
    return undefined;
  }

  return {
    rowWrapper,
    rootColumnWrapper,
    nestedColumnWrapper,
  };
}

export function useItemListDesignerCardPreviewRendererProps():
  | ItemListDesignerLayoutPreviewRendererProps
  | undefined {
  return useLayoutPreviewWrappers({ kind: "listItem" }, true);
}

export function useItemListDesignerExpandablePreviewRendererProps(): {
  readonly highlightedGroupedColumnIndex: number | null;
  readonly getCellLayoutRendererProps: (
    columnIndex: number,
  ) => ItemListDesignerLayoutPreviewRendererProps | undefined;
  readonly rowExpandLayoutRendererProps:
    | ItemListDesignerLayoutPreviewRendererProps
    | undefined;
} {
  const { columnsScope, activeGroupedColumnIndex, selectedGroupedColumnIndex } =
    useItemListDesigner();
  const { focusedGroupedColumnIndex } = useItemListDesignerStructureSession();

  const expandedRowProps = useLayoutPreviewWrappers(
    { kind: "expandableRow" },
    columnsScope === "expanded",
  );

  const activeGroupedCellProps = useLayoutPreviewWrappers(
    { kind: "groupedColumnCell", columnIndex: activeGroupedColumnIndex },
    columnsScope === "grouped",
  );

  const getCellLayoutRendererProps = useCallback(
    (columnIndex: number) => {
      if (
        columnsScope !== "grouped" ||
        columnIndex !== activeGroupedColumnIndex
      ) {
        return undefined;
      }

      return activeGroupedCellProps;
    },
    [activeGroupedCellProps, activeGroupedColumnIndex, columnsScope],
  );

  const highlightedGroupedColumnIndex =
    columnsScope === "grouped"
      ? (selectedGroupedColumnIndex ?? focusedGroupedColumnIndex)
      : null;

  return {
    highlightedGroupedColumnIndex,
    getCellLayoutRendererProps,
    rowExpandLayoutRendererProps: expandedRowProps,
  };
}
