import { createContext, useContext, type ReactNode } from "react";

import { useChartsEditor } from "./use-charts-editor.js";

interface ChartsContextValue {
  readonly editor: ReturnType<typeof useChartsEditor>;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
}

const ChartsContext = createContext<ChartsContextValue | undefined>(undefined);

interface ChartsProviderProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly children: ReactNode;
}

export function ChartsProvider({
  canCreate,
  canUpdate,
  children,
}: ChartsProviderProps) {
  const editor = useChartsEditor();

  return (
    <ChartsContext.Provider
      value={{
        editor,
        canCreate,
        canUpdate,
      }}
    >
      {children}
    </ChartsContext.Provider>
  );
}

export function useCharts(): ChartsContextValue {
  const context = useContext(ChartsContext);
  if (!context) {
    throw new Error("useCharts must be used within ChartsProvider");
  }
  return context;
}
