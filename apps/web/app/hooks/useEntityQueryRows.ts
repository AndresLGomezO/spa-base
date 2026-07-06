import type { ResolvedChartComponentConfig } from "@repo/ui-builder-core";

import type { EntityCatalogEntry } from "../entities/entity-catalog.js";
import {
  buildEntityQueryRowsFetchKey,
  fetchEntityQueryRows,
} from "../features/ui-builder/chart-data/resolve-entity-query-time-series.js";
import type { PageFilterContext } from "../lib/metric-binding-resolution.js";
import { entityQueryRowsQueryKey, queryClient } from "../query/query-client.js";

export async function loadEntityQueryRowsCached(
  dataSource: Extract<
    ResolvedChartComponentConfig["dataSource"],
    { type: "entityQuery" }
  >,
  catalog: readonly EntityCatalogEntry[],
  context: PageFilterContext,
  options: { readonly force?: boolean } = {},
): Promise<readonly Record<string, unknown>[]> {
  const fetchKey = buildEntityQueryRowsFetchKey(dataSource, context);
  if (!fetchKey) {
    return [];
  }

  return queryClient.fetchQuery({
    queryKey: entityQueryRowsQueryKey(fetchKey),
    queryFn: () => fetchEntityQueryRows(dataSource, catalog, context),
    ...(options.force ? { staleTime: 0 } : {}),
  });
}
