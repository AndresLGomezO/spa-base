import { createContext, useContext, type ReactNode } from "react";
import type { UseDataViewUrlStateResult } from "@repo/data-view";

const ViewFilterPageContext = createContext<UseDataViewUrlStateResult | null>(
  null,
);

export function ViewFilterPageProvider({
  value,
  children,
}: {
  readonly value: UseDataViewUrlStateResult;
  readonly children: ReactNode;
}) {
  return (
    <ViewFilterPageContext.Provider value={value}>
      {children}
    </ViewFilterPageContext.Provider>
  );
}

export function useOptionalViewFilterPageState(): UseDataViewUrlStateResult | null {
  return useContext(ViewFilterPageContext);
}
