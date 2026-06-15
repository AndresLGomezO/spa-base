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
import { useDetailViewDesigner } from "./detail-view-designer-context";

interface DetailViewDesignerStructureSessionContextValue {
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

const DetailViewDesignerStructureSessionContext =
  createContext<DetailViewDesignerStructureSessionContextValue | null>(null);

function StructurePanelSync() {
  const {
    structurePanelOpen,
    selectedStructureRowRef,
    selectedStructureColumnRef,
  } = useDetailViewDesigner();
  const { clearPanelFocus, setSelectedRow, setSelectedColumn } =
    useDetailViewDesignerStructureSession();

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

export function DetailViewDesignerStructureSessionProvider({
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
    (): DetailViewDesignerStructureSessionContextValue => ({
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
    <DetailViewDesignerStructureSessionContext.Provider value={value}>
      <StructurePanelSync />
      {children}
    </DetailViewDesignerStructureSessionContext.Provider>
  );
}

export function useOptionalDetailViewDesignerStructureSession(): DetailViewDesignerStructureSessionContextValue | null {
  return useContext(DetailViewDesignerStructureSessionContext);
}

export function useDetailViewDesignerStructureSession(): DetailViewDesignerStructureSessionContextValue {
  const context = useContext(DetailViewDesignerStructureSessionContext);
  if (!context) {
    throw new Error(
      "useDetailViewDesignerStructureSession must be used within DetailViewDesignerStructureSessionProvider",
    );
  }
  return context;
}
