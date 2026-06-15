import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import { useItemListDesigner } from "./item-list-designer-context";

interface ItemListDesignerStructureSessionContextValue {
  readonly focusedRow: ComponentRowRef | null;
  readonly setFocusedRow: (row: ComponentRowRef | null) => void;
  readonly focusedColumn: ComponentColumnRef | null;
  readonly setFocusedColumn: (column: ComponentColumnRef | null) => void;
  readonly selectedRow: ComponentRowRef | null;
  readonly setSelectedRow: (row: ComponentRowRef | null) => void;
  readonly selectedColumn: ComponentColumnRef | null;
  readonly setSelectedColumn: (column: ComponentColumnRef | null) => void;
  readonly treeRowFocus: ComponentRowRef | null;
  readonly treeColumnFocus: ComponentColumnRef | null;
  readonly previewRowFocus: ComponentRowRef | null;
  readonly previewColumnFocus: ComponentColumnRef | null;
  readonly focusedGroupedColumnIndex: number | null;
  readonly hoverGroupedColumn: (columnIndex: number | null) => void;
  readonly hoverRow: (row: ComponentRowRef | null) => void;
  readonly hoverColumn: (column: ComponentColumnRef | null) => void;
  readonly clearRowHover: () => void;
  readonly clearColumnHover: () => void;
  readonly clearPanelFocus: () => void;
}

const ItemListDesignerStructureSessionContext =
  createContext<ItemListDesignerStructureSessionContextValue | null>(null);

function StructurePanelSync() {
  const {
    structurePanelOpen,
    selectedStructureRowRef,
    selectedStructureColumnRef,
    selectedGroupedColumnIndex,
  } = useItemListDesigner();
  const { clearPanelFocus, setSelectedRow, setSelectedColumn } =
    useItemListDesignerStructureSession();

  useEffect(() => {
    if (!structurePanelOpen) {
      clearPanelFocus();
      return;
    }

    clearPanelFocus();

    if (selectedStructureRowRef) {
      setSelectedRow(selectedStructureRowRef);
      return;
    }

    if (selectedStructureColumnRef) {
      setSelectedColumn(selectedStructureColumnRef);
      return;
    }

    if (selectedGroupedColumnIndex != null) {
      return;
    }
  }, [
    clearPanelFocus,
    selectedGroupedColumnIndex,
    selectedStructureColumnRef,
    selectedStructureRowRef,
    setSelectedColumn,
    setSelectedRow,
    structurePanelOpen,
  ]);

  return null;
}

export function ItemListDesignerStructureSessionProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [focusedRow, setFocusedRow] = useState<ComponentRowRef | null>(null);
  const [focusedColumn, setFocusedColumn] = useState<ComponentColumnRef | null>(
    null,
  );
  const [selectedRow, setSelectedRow] = useState<ComponentRowRef | null>(null);
  const [selectedColumn, setSelectedColumn] =
    useState<ComponentColumnRef | null>(null);
  const [focusedGroupedColumnIndex, setFocusedGroupedColumnIndex] = useState<
    number | null
  >(null);

  const clearRowHover = useCallback(() => setFocusedRow(null), []);
  const clearColumnHover = useCallback(() => setFocusedColumn(null), []);
  const clearPanelFocus = useCallback(() => {
    setFocusedRow(null);
    setFocusedColumn(null);
    setSelectedRow(null);
    setSelectedColumn(null);
  }, []);

  const hoverRow = useCallback(
    (row: ComponentRowRef | null) => {
      if (row) {
        clearColumnHover();
      }
      setFocusedRow(row);
    },
    [clearColumnHover],
  );

  const hoverColumn = useCallback(
    (column: ComponentColumnRef | null) => {
      if (column) {
        clearRowHover();
      }
      setFocusedColumn(column);
    },
    [clearRowHover],
  );

  const hoverGroupedColumn = useCallback((columnIndex: number | null) => {
    setFocusedGroupedColumnIndex(columnIndex);
  }, []);

  const previewRowFocus = focusedRow ?? selectedRow;
  const previewColumnFocus = focusedColumn ?? selectedColumn;

  const value = useMemo(
    (): ItemListDesignerStructureSessionContextValue => ({
      focusedRow,
      setFocusedRow,
      focusedColumn,
      setFocusedColumn,
      selectedRow,
      setSelectedRow,
      selectedColumn,
      setSelectedColumn,
      treeRowFocus: focusedRow ?? selectedRow,
      treeColumnFocus: focusedColumn ?? selectedColumn,
      previewRowFocus,
      previewColumnFocus,
      focusedGroupedColumnIndex,
      hoverGroupedColumn,
      hoverRow,
      hoverColumn,
      clearRowHover,
      clearColumnHover,
      clearPanelFocus,
    }),
    [
      clearColumnHover,
      clearPanelFocus,
      clearRowHover,
      focusedColumn,
      focusedGroupedColumnIndex,
      focusedRow,
      hoverColumn,
      hoverGroupedColumn,
      hoverRow,
      previewColumnFocus,
      previewRowFocus,
      selectedColumn,
      selectedRow,
    ],
  );

  return (
    <ItemListDesignerStructureSessionContext.Provider value={value}>
      <StructurePanelSync />
      {children}
    </ItemListDesignerStructureSessionContext.Provider>
  );
}

export function useOptionalItemListDesignerStructureSession(): ItemListDesignerStructureSessionContextValue | null {
  return useContext(ItemListDesignerStructureSessionContext);
}

export function useItemListDesignerStructureSession(): ItemListDesignerStructureSessionContextValue {
  const context = useContext(ItemListDesignerStructureSessionContext);
  if (!context) {
    throw new Error(
      "useItemListDesignerStructureSession must be used within ItemListDesignerStructureSessionProvider",
    );
  }
  return context;
}
