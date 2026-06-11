import { createContext, useContext, type ReactNode } from "react";
import type { ResponsiveGridBreakpoint } from "@repo/ui-builder-core";

const PreviewBreakpointContext = createContext<
  ResponsiveGridBreakpoint | undefined
>(undefined);

export interface PreviewBreakpointProviderProps {
  readonly breakpoint: ResponsiveGridBreakpoint | undefined;
  readonly children: ReactNode;
}

export function PreviewBreakpointProvider({
  breakpoint,
  children,
}: PreviewBreakpointProviderProps): ReactNode {
  return (
    <PreviewBreakpointContext.Provider value={breakpoint}>
      {children}
    </PreviewBreakpointContext.Provider>
  );
}

export function usePreviewBreakpoint(): ResponsiveGridBreakpoint | undefined {
  return useContext(PreviewBreakpointContext);
}
