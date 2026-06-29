import { useMemo } from "react";
import { useDataViewUrlState } from "@repo/data-view";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import type { DashboardSectionDefinition } from "@repo/entities";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { collectViewFilterDescriptors } from "./collect-view-filter-descriptors";
import { useDashboardDateFilterUrlState } from "./use-dashboard-date-filter-url-state";
import type { ViewFilterPageState } from "./view-filter-page-context";

export function useDashboardViewFilterUrlState(options: {
  readonly dashboardLayout: UiLayoutDocument | null | undefined;
  readonly sections: readonly DashboardSectionDefinition[];
  readonly catalog: readonly EntityCatalogEntry[];
}): {
  readonly collected: ReturnType<typeof collectViewFilterDescriptors>;
  readonly pageState: ViewFilterPageState;
} {
  const collected = useMemo(() => {
    if (!options.dashboardLayout) {
      return {
        filterColumns: [],
        searchColumns: [],
        catalogEntities: [],
        filterConfigs: [],
        dateFilterConfig: null,
      };
    }

    return collectViewFilterDescriptors({
      dashboardLayout: options.dashboardLayout,
      sections: options.sections,
      catalog: options.catalog,
    });
  }, [options.catalog, options.dashboardLayout, options.sections]);

  const urlState = useDataViewUrlState(collected.filterColumns);
  const dateFilter = useDashboardDateFilterUrlState(collected.dateFilterConfig);

  const pageState = useMemo(
    (): ViewFilterPageState => ({
      ...urlState,
      dateFilter,
    }),
    [dateFilter, urlState],
  );

  return {
    collected,
    pageState,
  };
}
