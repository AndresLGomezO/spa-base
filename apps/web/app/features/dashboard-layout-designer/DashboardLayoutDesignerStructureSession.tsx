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
import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";

interface DashboardLayoutDesignerStructureSessionContextValue {
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

const DashboardLayoutDesignerStructureSessionContext =
  createContext<DashboardLayoutDesignerStructureSessionContextValue | null>(
    null,
  );

function StructurePanelSync() {
  const {
    structurePanelOpen,
    selectedStructureRowRef,
    selectedStructureColumnRef,
  } = useDashboardLayoutDesigner();
  const { clearPanelFocus, setSelectedRow, setSelectedColumn } =
    useDashboardLayoutDesignerStructureSession();

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

export function DashboardLayoutDesignerStructureSessionProvider({
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
    (): DashboardLayoutDesignerStructureSessionContextValue => ({
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
    <DashboardLayoutDesignerStructureSessionContext.Provider value={value}>
      <StructurePanelSync />
      {children}
    </DashboardLayoutDesignerStructureSessionContext.Provider>
  );
}

export function useOptionalDashboardLayoutDesignerStructureSession(): DashboardLayoutDesignerStructureSessionContextValue | null {
  return useContext(DashboardLayoutDesignerStructureSessionContext);
}

export function useDashboardLayoutDesignerStructureSession(): DashboardLayoutDesignerStructureSessionContextValue {
  const context = useContext(DashboardLayoutDesignerStructureSessionContext);
  if (!context) {
    throw new Error(
      "useDashboardLayoutDesignerStructureSession must be used within DashboardLayoutDesignerStructureSessionProvider",
    );
  }
  return context;
}
