import { createContext, useContext, type ReactNode } from "react";

import type { LayoutWrapperRenderOptions } from "./layout/layout-wrapper-types.js";

export type LayoutRenderOptions = LayoutWrapperRenderOptions;

const LayoutRenderOptionsContext = createContext<
  LayoutRenderOptions | undefined
>(undefined);

export interface LayoutRenderOptionsProviderProps {
  readonly value: LayoutRenderOptions;
  readonly children: ReactNode;
}

export function LayoutRenderOptionsProvider({
  value,
  children,
}: LayoutRenderOptionsProviderProps): ReactNode {
  return (
    <LayoutRenderOptionsContext.Provider value={value}>
      {children}
    </LayoutRenderOptionsContext.Provider>
  );
}

export function useLayoutRenderOptions(): LayoutRenderOptions {
  return useContext(LayoutRenderOptionsContext) ?? {};
}
