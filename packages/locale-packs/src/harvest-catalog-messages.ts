import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  harvestDashboardLayout,
  harvestEntityDefinition,
  harvestNamedCatalogItem,
  harvestSidebarLayout,
  harvestUiOverride,
  isPlainObject,
  setMessage,
  sortHarvestedMessages,
  type HarvestedMessages,
} from "./harvest-record-walkers.js";

export type { HarvestedMessages };

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function listJsonFiles(dirPath: string): string[] {
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath)
    .filter(
      (name) =>
        name.endsWith(".json") &&
        !name.startsWith("_") &&
        !name.startsWith("."),
    )
    .sort((a, b) => a.localeCompare(b))
    .map((name) => join(dirPath, name));
}

function unwrapData(parsed: unknown): unknown {
  if (isPlainObject(parsed) && "data" in parsed) {
    return parsed.data;
  }
  return parsed;
}

/**
 * Walk Rates/tenant catalog JSON under `catalogsDir` and produce
 * English message maps keyed by structural path.
 */
export function harvestCatalogMessages(catalogsDir: string): HarvestedMessages {
  const out: HarvestedMessages = {};

  for (const filePath of listJsonFiles(
    join(catalogsDir, "entity-definitions"),
  )) {
    const data = unwrapData(readJson(filePath));
    if (isPlainObject(data)) harvestEntityDefinition(out, data);
  }

  const categoriesPath = join(
    catalogsDir,
    "entity-definitions",
    "_categories.json",
  );
  if (existsSync(categoriesPath)) {
    const meta = readJson(categoriesPath);
    const categories =
      isPlainObject(meta) && Array.isArray(meta.entityCategories)
        ? meta.entityCategories
        : [];
    for (const category of categories) {
      if (!isPlainObject(category) || typeof category.id !== "string") continue;
      setMessage(out, `entityCategory.${category.id}.name`, category.name);
    }
  }

  for (const filePath of listJsonFiles(
    join(catalogsDir, "metric-definitions"),
  )) {
    const data = unwrapData(readJson(filePath));
    if (isPlainObject(data)) harvestNamedCatalogItem(out, "metric", data);
  }

  for (const filePath of listJsonFiles(
    join(catalogsDir, "chart-definitions"),
  )) {
    const data = unwrapData(readJson(filePath));
    if (isPlainObject(data)) harvestNamedCatalogItem(out, "chart", data);
  }

  for (const filePath of listJsonFiles(
    join(catalogsDir, "query-definitions"),
  )) {
    const data = unwrapData(readJson(filePath));
    if (isPlainObject(data)) harvestNamedCatalogItem(out, "query", data);
  }

  for (const filePath of listJsonFiles(join(catalogsDir, "custom-views"))) {
    const data = unwrapData(readJson(filePath));
    if (isPlainObject(data)) {
      harvestNamedCatalogItem(out, "customView", data, "viewId");
    }
  }

  for (const filePath of listJsonFiles(
    join(catalogsDir, "entity-ui-overrides"),
  )) {
    const data = unwrapData(readJson(filePath));
    if (isPlainObject(data)) harvestUiOverride(out, data);
  }

  // Local UI slices (applied after catalog seed) under tenant-import/ui/
  const uiOverridesDir = join(
    dirname(catalogsDir),
    "ui",
    "entity-ui-overrides",
  );
  for (const filePath of listJsonFiles(uiOverridesDir)) {
    const data = unwrapData(readJson(filePath));
    if (isPlainObject(data)) harvestUiOverride(out, data);
  }

  const sidebarPath = join(catalogsDir, "tenant-sidebar-layout.json");
  if (existsSync(sidebarPath)) {
    const sidebar = readJson(sidebarPath);
    if (isPlainObject(sidebar)) {
      harvestSidebarLayout(out, sidebar);
    }
  }

  const dashboardPath = join(catalogsDir, "tenant-dashboard-layout.json");
  if (existsSync(dashboardPath)) {
    const dashboard = readJson(dashboardPath);
    if (isPlainObject(dashboard)) {
      harvestDashboardLayout(out, dashboard);
    }
  }

  return sortHarvestedMessages(out);
}

export function mergeLocaleMessages(input: {
  readonly harvested: HarvestedMessages;
  readonly existing: HarvestedMessages;
  readonly mode: "en" | "mirror";
}): HarvestedMessages {
  const out: HarvestedMessages = {};
  for (const key of Object.keys(input.harvested).sort((a, b) =>
    a.localeCompare(b),
  )) {
    if (input.mode === "en") {
      out[key] = input.harvested[key] ?? "";
      continue;
    }
    const existing = input.existing[key];
    out[key] =
      typeof existing === "string" && existing.trim().length > 0
        ? existing
        : "";
  }
  return out;
}
