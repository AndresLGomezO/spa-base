import { join } from "node:path";

import {
  mergeSingularCatalogDir,
  readEntityCategoriesMeta,
} from "./merge-singular-catalog-dir.js";
import { resolveLocalTenantCatalogsDir } from "./load-tenant-config.js";

function dir(relativeDir: string, startDir?: string): string {
  return join(resolveLocalTenantCatalogsDir(startDir), relativeDir);
}

export function loadEntityDefinitionsCatalogJson(startDir?: string): string {
  const entityDir = dir("entity-definitions", startDir);
  const entityCategories = readEntityCategoriesMeta(entityDir);
  return mergeSingularCatalogDir(entityDir, {
    kind: "entity-definitions-catalog",
    version: 1,
    itemsKey: "entityDefinitions",
    extra: entityCategories ? { entityCategories } : undefined,
  });
}

export function loadDataHooksCatalogJson(startDir?: string): string {
  return mergeSingularCatalogDir(dir("data-hooks", startDir), {
    kind: "data-hooks-catalog",
    version: 1,
    itemsKey: "dataHooks",
  });
}

export function loadQueryDefinitionsCatalogJson(startDir?: string): string {
  return mergeSingularCatalogDir(dir("query-definitions", startDir), {
    kind: "entity-query-definitions-catalog",
    version: 1,
    itemsKey: "entityQueryDefinitions",
  });
}

export function loadMetricDefinitionsCatalogJson(startDir?: string): string {
  return mergeSingularCatalogDir(dir("metric-definitions", startDir), {
    kind: "metric-definitions-catalog",
    version: 1,
    itemsKey: "metricDefinitions",
  });
}

export function loadChartDefinitionsCatalogJson(startDir?: string): string {
  return mergeSingularCatalogDir(dir("chart-definitions", startDir), {
    kind: "chart-definitions-catalog",
    version: 1,
    itemsKey: "chartDefinitions",
  });
}

export function loadFormulaDefinitionsCatalogJson(startDir?: string): string {
  return mergeSingularCatalogDir(dir("formula-definitions", startDir), {
    kind: "formula-definitions-catalog",
    version: 1,
    itemsKey: "formulaDefinitions",
  });
}

export function loadCustomViewsCatalogJson(startDir?: string): string {
  return mergeSingularCatalogDir(dir("custom-views", startDir), {
    kind: "custom-views-catalog",
    version: 1,
    itemsKey: "customViews",
  });
}

export function loadEntityUiOverridesCatalogJson(startDir?: string): string {
  return mergeSingularCatalogDir(dir("entity-ui-overrides", startDir), {
    kind: "entity-ui-overrides-catalog",
    version: 1,
    itemsKey: "overrides",
  });
}

export function loadUiBuilderPresetsCatalogJson(startDir?: string): string {
  return mergeSingularCatalogDir(dir("ui-builder-presets", startDir), {
    kind: "ui-builder-presets-catalog",
    version: 1,
    itemsKey: "presets",
    exportedAt: false,
  });
}
