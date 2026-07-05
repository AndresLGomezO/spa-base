import { createContext, useContext, type ReactNode } from "react";

import { useMetricsEditor } from "./use-metrics-editor";

interface MetricsContextValue {
  readonly editor: ReturnType<typeof useMetricsEditor>;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canBackfill: boolean;
}

const MetricsContext = createContext<MetricsContextValue | undefined>(
  undefined,
);

interface MetricsProviderProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canBackfill: boolean;
  readonly children: ReactNode;
}

export function MetricsProvider({
  canCreate,
  canUpdate,
  canBackfill,
  children,
}: MetricsProviderProps) {
  const editor = useMetricsEditor();

  return (
    <MetricsContext.Provider
      value={{
        editor,
        canCreate,
        canUpdate,
        canBackfill,
      }}
    >
      {children}
    </MetricsContext.Provider>
  );
}

export function useMetrics(): MetricsContextValue {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error("useMetrics must be used within MetricsProvider");
  }
  return context;
}
