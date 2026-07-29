import {
  harvestDashboardLayout,
  harvestEntityCategory,
  harvestEntityDefinition,
  harvestNamedCatalogItem,
  harvestSidebarLayout,
  harvestUiOverride,
  isPlainObject,
  sortHarvestedMessages,
  type HarvestedMessages,
} from "./harvest-record-walkers.js";

export type { HarvestedMessages };

export interface LiveHarvestRepositories {
  readonly entityDefinition: {
    list(tenantId: string): Promise<readonly unknown[]>;
  };
  readonly entityCategory: {
    list(tenantId: string): Promise<readonly unknown[]>;
  };
  readonly metricDefinition: {
    list(tenantId: string): Promise<readonly unknown[]>;
  };
  readonly chartDefinition: {
    list(tenantId: string): Promise<readonly unknown[]>;
  };
  readonly customView: {
    list(tenantId: string): Promise<readonly unknown[]>;
  };
  readonly entityQueryDefinition: {
    list(tenantId: string): Promise<readonly unknown[]>;
  };
  readonly entityUiOverride: {
    list(tenantId: string): Promise<readonly unknown[]>;
  };
  readonly tenantSidebarLayout: {
    get(tenantId: string): Promise<unknown | null>;
  };
  readonly tenantDashboardLayout: {
    get(tenantId: string): Promise<unknown | null>;
  };
  // formulaDefinition / insightSurface reserved for follow-up walkers
}

/**
 * Harvest tenant catalog UI strings from live repository records.
 */
export async function harvestTenantMessages(
  deps: LiveHarvestRepositories,
  tenantId: string,
): Promise<HarvestedMessages> {
  const out: HarvestedMessages = {};

  const [
    entities,
    categories,
    metrics,
    charts,
    customViews,
    queries,
    uiOverrides,
    sidebar,
    dashboard,
  ] = await Promise.all([
    deps.entityDefinition.list(tenantId),
    deps.entityCategory.list(tenantId),
    deps.metricDefinition.list(tenantId),
    deps.chartDefinition.list(tenantId),
    deps.customView.list(tenantId),
    deps.entityQueryDefinition.list(tenantId),
    deps.entityUiOverride.list(tenantId),
    deps.tenantSidebarLayout.get(tenantId),
    deps.tenantDashboardLayout.get(tenantId),
  ]);

  for (const entity of entities) {
    if (isPlainObject(entity)) harvestEntityDefinition(out, entity);
  }

  for (const category of categories) {
    if (isPlainObject(category)) harvestEntityCategory(out, category);
  }

  for (const metric of metrics) {
    if (isPlainObject(metric)) harvestNamedCatalogItem(out, "metric", metric);
  }

  for (const chart of charts) {
    if (isPlainObject(chart)) harvestNamedCatalogItem(out, "chart", chart);
  }

  for (const view of customViews) {
    if (isPlainObject(view)) {
      harvestNamedCatalogItem(out, "customView", view, "viewId");
    }
  }

  for (const query of queries) {
    if (isPlainObject(query)) harvestNamedCatalogItem(out, "query", query);
  }

  for (const override of uiOverrides) {
    if (isPlainObject(override)) harvestUiOverride(out, override);
  }

  if (isPlainObject(sidebar)) {
    harvestSidebarLayout(out, sidebar);
  }

  if (isPlainObject(dashboard)) {
    harvestDashboardLayout(out, dashboard);
  }

  return sortHarvestedMessages(out);
}
