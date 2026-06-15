import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ComponentColumnRef } from "./form-designer-component-column-ref";
import type { ComponentRowRef } from "./form-designer-component-row-ref";
import type { ComponentsTreeScope } from "./form-designer-components-layout";
import { useFormDesigner } from "./form-designer-context";

interface FormDesignerComponentsSessionContextValue {
  readonly treeScope: ComponentsTreeScope;
  readonly setTreeScope: (scope: ComponentsTreeScope) => void;
  readonly stepIndex: number;
  readonly setStepIndex: (index: number) => void;
  readonly focusedRow: ComponentRowRef | null;
  readonly setFocusedRow: (row: ComponentRowRef | null) => void;
  readonly focusedColumn: ComponentColumnRef | null;
  readonly setFocusedColumn: (column: ComponentColumnRef | null) => void;
  readonly selectedRow: ComponentRowRef | null;
  readonly setSelectedRow: (row: ComponentRowRef | null) => void;
  readonly selectedColumn: ComponentColumnRef | null;
  readonly setSelectedColumn: (column: ComponentColumnRef | null) => void;
  readonly resolvedRowFocus: ComponentRowRef | null;
  readonly resolvedColumnFocus: ComponentColumnRef | null;
  readonly treeRowFocus: ComponentRowRef | null;
  readonly treeColumnFocus: ComponentColumnRef | null;
  readonly previewRowFocus: ComponentRowRef | null;
  readonly previewColumnFocus: ComponentColumnRef | null;
  readonly hoverRow: (row: ComponentRowRef | null) => void;
  readonly hoverColumn: (column: ComponentColumnRef | null) => void;
  readonly clearRowHover: () => void;
  readonly clearColumnHover: () => void;
  readonly clearPanelFocus: () => void;
  /** @deprecated Use clearRowHover */
  readonly clearRowFocus: () => void;
  /** @deprecated Use clearColumnHover */
  readonly clearColumnFocus: () => void;
}

const FormDesignerComponentsSessionContext =
  createContext<FormDesignerComponentsSessionContextValue | null>(null);

interface FormDesignerComponentsSessionProviderProps {
  readonly presentation: "plain" | "wizard";
  readonly children: ReactNode;
}

export function FormDesignerComponentsSessionProvider({
  presentation,
  children,
}: FormDesignerComponentsSessionProviderProps) {
  const [treeScope, setTreeScope] = useState<ComponentsTreeScope>(
    presentation === "wizard" ? "shell" : "main",
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [focusedRow, setFocusedRow] = useState<ComponentRowRef | null>(null);
  const [focusedColumn, setFocusedColumn] = useState<ComponentColumnRef | null>(
    null,
  );
  const [selectedRow, setSelectedRow] = useState<ComponentRowRef | null>(null);
  const [selectedColumn, setSelectedColumn] =
    useState<ComponentColumnRef | null>(null);

  const clearRowHover = useCallback(() => {
    setFocusedRow(null);
  }, []);

  const clearColumnHover = useCallback(() => {
    setFocusedColumn(null);
  }, []);

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

  useEffect(() => {
    clearPanelFocus();
  }, [clearPanelFocus, stepIndex, treeScope]);

  const resolvedRowFocus = selectedRow ?? focusedRow;
  const resolvedColumnFocus = selectedColumn ?? focusedColumn;
  const treeRowFocus = focusedRow ?? selectedRow;
  const treeColumnFocus = focusedColumn ?? selectedColumn;
  const previewRowFocus = focusedRow ?? selectedRow;
  const previewColumnFocus = focusedColumn ?? selectedColumn;

  const value = useMemo(
    (): FormDesignerComponentsSessionContextValue => ({
      treeScope,
      setTreeScope,
      stepIndex,
      setStepIndex,
      focusedRow,
      setFocusedRow,
      focusedColumn,
      setFocusedColumn,
      selectedRow,
      setSelectedRow,
      selectedColumn,
      setSelectedColumn,
      resolvedRowFocus,
      resolvedColumnFocus,
      treeRowFocus,
      treeColumnFocus,
      previewRowFocus,
      previewColumnFocus,
      hoverRow,
      hoverColumn,
      clearRowHover,
      clearColumnHover,
      clearPanelFocus,
      clearRowFocus: clearRowHover,
      clearColumnFocus: clearColumnHover,
    }),
    [
      clearColumnHover,
      clearPanelFocus,
      clearRowHover,
      hoverColumn,
      hoverRow,
      focusedColumn,
      focusedRow,
      previewColumnFocus,
      previewRowFocus,
      resolvedColumnFocus,
      resolvedRowFocus,
      selectedColumn,
      treeColumnFocus,
      treeRowFocus,
      selectedRow,
      stepIndex,
      treeScope,
    ],
  );

  return (
    <FormDesignerComponentsSessionContext.Provider value={value}>
      <ComponentPanelSync />
      {children}
    </FormDesignerComponentsSessionContext.Provider>
  );
}

function ComponentPanelSync() {
  const {
    componentRowPanelOpen,
    selectedComponentRowRef,
    selectedComponentColumnRef,
  } = useFormDesigner();
  const { clearPanelFocus, setSelectedRow, setSelectedColumn } =
    useFormDesignerComponentsSession();

  useEffect(() => {
    if (!componentRowPanelOpen) {
      clearPanelFocus();
      return;
    }

    if (selectedComponentRowRef) {
      setSelectedRow(selectedComponentRowRef);
      setSelectedColumn(null);
      return;
    }

    if (selectedComponentColumnRef) {
      setSelectedColumn(selectedComponentColumnRef);
      setSelectedRow(null);
    }
  }, [
    clearPanelFocus,
    componentRowPanelOpen,
    selectedComponentColumnRef,
    selectedComponentRowRef,
    setSelectedColumn,
    setSelectedRow,
  ]);

  return null;
}

export function useFormDesignerComponentsSession(): FormDesignerComponentsSessionContextValue {
  const context = useContext(FormDesignerComponentsSessionContext);
  if (!context) {
    throw new Error(
      "useFormDesignerComponentsSession must be used within FormDesignerComponentsSessionProvider",
    );
  }
  return context;
}

export function useOptionalFormDesignerComponentsSession(): FormDesignerComponentsSessionContextValue | null {
  return useContext(FormDesignerComponentsSessionContext);
}
