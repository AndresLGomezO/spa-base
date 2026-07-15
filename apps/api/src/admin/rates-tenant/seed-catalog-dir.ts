import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  mergeSingularCatalogDir,
  readEntityCategoriesMeta,
} from "./merge-singular-catalog-dir.js";

export const RATES_CATALOG_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "catalogs",
);

export {
  mergeSingularCatalogDir,
  readEntityCategoriesMeta,
} from "./merge-singular-catalog-dir.js";

function dir(relativeDir: string): string {
  return join(RATES_CATALOG_DIR, relativeDir);
}

export function loadEntityDefinitionsCatalogJson(): string {
  const entityDir = dir("entity-definitions");
  const entityCategories = readEntityCategoriesMeta(entityDir);
  return mergeSingularCatalogDir(entityDir, {
    kind: "entity-definitions-catalog",
    version: 1,
    itemsKey: "entityDefinitions",
    extra: entityCategories ? { entityCategories } : undefined,
  });
}

export function loadDataHooksCatalogJson(): string {
  return mergeSingularCatalogDir(dir("data-hooks"), {
    kind: "data-hooks-catalog",
    version: 1,
    itemsKey: "dataHooks",
  });
}

export function loadQueryDefinitionsCatalogJson(): string {
  return mergeSingularCatalogDir(dir("query-definitions"), {
    kind: "entity-query-definitions-catalog",
    version: 1,
    itemsKey: "entityQueryDefinitions",
  });
}

export function loadMetricDefinitionsCatalogJson(): string {
  return mergeSingularCatalogDir(dir("metric-definitions"), {
    kind: "metric-definitions-catalog",
    version: 1,
    itemsKey: "metricDefinitions",
  });
}

export function loadChartDefinitionsCatalogJson(): string {
  return mergeSingularCatalogDir(dir("chart-definitions"), {
    kind: "chart-definitions-catalog",
    version: 1,
    itemsKey: "chartDefinitions",
  });
}

export function loadFormulaDefinitionsCatalogJson(): string {
  return mergeSingularCatalogDir(dir("formula-definitions"), {
    kind: "formula-definitions-catalog",
    version: 1,
    itemsKey: "formulaDefinitions",
  });
}

export function loadCustomViewsCatalogJson(): string {
  return mergeSingularCatalogDir(dir("custom-views"), {
    kind: "custom-views-catalog",
    version: 1,
    itemsKey: "customViews",
  });
}

export function loadEntityUiOverridesCatalogJson(): string {
  return mergeSingularCatalogDir(dir("entity-ui-overrides"), {
    kind: "entity-ui-overrides-catalog",
    version: 1,
    itemsKey: "overrides",
  });
}

export function loadUiBuilderPresetsCatalogJson(): string {
  return mergeSingularCatalogDir(dir("ui-builder-presets"), {
    kind: "ui-builder-presets-catalog",
    version: 1,
    itemsKey: "presets",
    exportedAt: false,
  });
}
