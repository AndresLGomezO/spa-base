import { createContext, useContext, type ReactNode } from "react";
import type { UseDataViewUrlStateResult } from "@repo/data-view";

import type { DashboardDateFilterState } from "./use-dashboard-date-filter-url-state";

export interface ViewFilterPageState extends UseDataViewUrlStateResult {
  readonly dateFilter: DashboardDateFilterState;
}

const ViewFilterPageContext = createContext<ViewFilterPageState | null>(null);

export function ViewFilterPageProvider({
  value,
  children,
}: {
  readonly value: ViewFilterPageState;
  readonly children: ReactNode;
}) {
  return (
    <ViewFilterPageContext.Provider value={value}>
      {children}
    </ViewFilterPageContext.Provider>
  );
}

export function useOptionalViewFilterPageState(): ViewFilterPageState | null {
  return useContext(ViewFilterPageContext);
}
