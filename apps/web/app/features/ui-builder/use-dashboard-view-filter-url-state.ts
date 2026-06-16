import { useMemo } from "react";
import { useDataViewUrlState } from "@repo/data-view";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import type { DashboardSectionDefinition } from "@repo/entities";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { collectViewFilterDescriptors } from "./collect-view-filter-descriptors";

export function useDashboardViewFilterUrlState(options: {
  readonly dashboardLayout: UiLayoutDocument | null | undefined;
  readonly sections: readonly DashboardSectionDefinition[];
  readonly catalog: readonly EntityCatalogEntry[];
}) {
  const collected = useMemo(() => {
    if (!options.dashboardLayout) {
      return {
        filterColumns: [],
        searchColumns: [],
        catalogEntities: [],
        filterConfigs: [],
      };
    }

    return collectViewFilterDescriptors({
      dashboardLayout: options.dashboardLayout,
      sections: options.sections,
      catalog: options.catalog,
    });
  }, [options.catalog, options.dashboardLayout, options.sections]);

  const urlState = useDataViewUrlState(collected.filterColumns);

  return {
    collected,
    urlState,
  };
}
