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
import { useAutoSelectFirstStructureRowOnEntityChange } from "../../components/design-layout/use-auto-select-first-structure-row";
import { useMainViewDesigner } from "./main-view-designer-context";

interface MainViewDesignerStructureSessionContextValue {
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
  readonly hoverRow: (row: ComponentRowRef | null) => void;
  readonly hoverColumn: (column: ComponentColumnRef | null) => void;
  readonly clearRowHover: () => void;
  readonly clearColumnHover: () => void;
  readonly clearPanelFocus: () => void;
}

const MainViewDesignerStructureSessionContext =
  createContext<MainViewDesignerStructureSessionContextValue | null>(null);

function StructurePanelSync() {
  const {
    structurePanelOpen,
    selectedStructureRowRef,
    selectedStructureColumnRef,
  } = useMainViewDesigner();
  const { clearPanelFocus, setSelectedRow, setSelectedColumn } =
    useMainViewDesignerStructureSession();

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
    }
  }, [
    clearPanelFocus,
    selectedStructureColumnRef,
    selectedStructureRowRef,
    setSelectedColumn,
    setSelectedRow,
    structurePanelOpen,
  ]);

  return null;
}

function AutoSelectFirstStructureRowSync() {
  const { editor } = useMainViewDesigner();
  const { setSelectedRow } = useMainViewDesignerStructureSession();

  useAutoSelectFirstStructureRowOnEntityChange(
    editor.entityName,
    editor.layout,
    setSelectedRow,
  );

  return null;
}

export function MainViewDesignerStructureSessionProvider({
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

  const previewRowFocus = focusedRow ?? selectedRow;
  const previewColumnFocus = focusedColumn ?? selectedColumn;

  const value = useMemo(
    (): MainViewDesignerStructureSessionContextValue => ({
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
      focusedRow,
      hoverColumn,
      hoverRow,
      previewColumnFocus,
      previewRowFocus,
      selectedColumn,
      selectedRow,
    ],
  );

  return (
    <MainViewDesignerStructureSessionContext.Provider value={value}>
      <StructurePanelSync />
      <AutoSelectFirstStructureRowSync />
      {children}
    </MainViewDesignerStructureSessionContext.Provider>
  );
}

export function useOptionalMainViewDesignerStructureSession(): MainViewDesignerStructureSessionContextValue | null {
  return useContext(MainViewDesignerStructureSessionContext);
}

export function useMainViewDesignerStructureSession(): MainViewDesignerStructureSessionContextValue {
  const context = useContext(MainViewDesignerStructureSessionContext);
  if (!context) {
    throw new Error(
      "useMainViewDesignerStructureSession must be used within MainViewDesignerStructureSessionProvider",
    );
  }
  return context;
}
