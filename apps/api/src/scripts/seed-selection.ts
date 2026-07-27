import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { resolveTenantImportDir } from "./resolve-tenant-import-dir.js";

/** Catalog slice keys for `pnpm seed:database -- --only …`. */
export const SEED_CATALOG_COMPONENTS = [
  "entities",
  "metrics",
  "queries",
  "hooks",
  "formulas",
  "charts",
  "insight-surfaces",
  "custom-views",
] as const;

const SEED_OTHER_COMPONENTS = [
  "platform",
  "generated",
  "emailMatchBindings",
  "ui",
  "demo",
  "metrics-backfill",
  "hook-cache",
] as const;

function listSubdirNames(parentDir: string): string[] {
  if (!existsSync(parentDir)) {
    return [];
  }
  return readdirSync(parentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

/** Local import entity names (JSON under `.local/tenant-import/records`). */
function listLocalEntityComponents(
  startDir: string = process.cwd(),
): readonly string[] {
  return listSubdirNames(join(resolveTenantImportDir(startDir), "records"));
}

/** Generated import entity names (under `.local/tenant-import/generated`). */
function listGeneratedEntityComponents(
  startDir: string = process.cwd(),
): readonly string[] {
  return listSubdirNames(join(resolveTenantImportDir(startDir), "generated"));
}

function listSeedComponentKeys(
  startDir: string = process.cwd(),
): readonly string[] {
  return [
    ...SEED_OTHER_COMPONENTS,
    ...SEED_CATALOG_COMPONENTS,
    ...listLocalEntityComponents(startDir),
    ...listGeneratedEntityComponents(startDir),
  ];
}

export type SeedComponentKey = string;

export interface SeedSelection {
  /** `null` = full seed (all components). */
  readonly components: ReadonlySet<SeedComponentKey> | null;
  /** `null` = no id filter. */
  readonly ids: ReadonlySet<string> | null;
  /**
   * When true, delete existing seeded rows for the selected components (and
   * optional `--ids`) before upserting from disk.
   */
  readonly drop: boolean;
}

export function isFullSeed(selection: SeedSelection): boolean {
  return selection.components === null;
}

export function selectionIncludes(
  selection: SeedSelection,
  component: SeedComponentKey,
): boolean {
  if (selection.components === null) {
    return true;
  }
  return selection.components.has(component);
}

export function selectionIncludesAny(
  selection: SeedSelection,
  components: readonly SeedComponentKey[],
): boolean {
  return components.some((component) =>
    selectionIncludes(selection, component),
  );
}

export function listSelectedLocalEntityNames(
  selection: SeedSelection,
  startDir: string = process.cwd(),
): readonly string[] | undefined {
  if (selection.components === null) {
    return undefined;
  }
  const local = listLocalEntityComponents(startDir);
  return local.filter((name) => selection.components!.has(name));
}

export function listSelectedGeneratedEntityNames(
  selection: SeedSelection,
  startDir: string = process.cwd(),
): readonly string[] | undefined {
  if (selection.components === null) {
    return undefined;
  }
  const generated = listGeneratedEntityComponents(startDir);
  if (selection.components.has("generated")) {
    return [...generated];
  }
  return generated.filter((name) => selection.components!.has(name));
}

export function parseCommaSeparatedSet(value: string): Set<string> {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return new Set(parts);
}

export function assertValidSeedComponents(
  components: ReadonlySet<string>,
  startDir: string = process.cwd(),
): asserts components is ReadonlySet<SeedComponentKey> {
  const allowed = new Set(listSeedComponentKeys(startDir));
  const unknown = [...components].filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown --only component(s): ${unknown.join(", ")}. Allowed: ${[...allowed].join(", ")}.`,
    );
  }
  if (components.size === 0) {
    throw new Error(
      "Missing value for --only (expected comma-separated components).",
    );
  }
}

export function assertIdsAllowedForSelection(
  components: ReadonlySet<SeedComponentKey>,
  ids: ReadonlySet<string> | null,
  startDir: string = process.cwd(),
): void {
  if (!ids || ids.size === 0) {
    return;
  }
  const recordLevel = new Set([
    ...listLocalEntityComponents(startDir),
    ...listGeneratedEntityComponents(startDir),
    "emailMatchBindings",
  ]);
  const matched = [...components].filter((key) => recordLevel.has(key));
  if (matched.length === 0) {
    throw new Error(
      `--ids requires at least one record-level --only component (${[...recordLevel].join(", ")}).`,
    );
  }
}

export function assertDropAllowedForSelection(
  components: ReadonlySet<SeedComponentKey> | null,
  drop: boolean,
  startDir: string = process.cwd(),
): void {
  if (!drop) {
    return;
  }
  if (components === null) {
    throw new Error(
      "--drop requires --only (refusing to drop the entire tenant seed).",
    );
  }
  const recordLevel = new Set([
    ...listLocalEntityComponents(startDir),
    ...listGeneratedEntityComponents(startDir),
    "emailMatchBindings",
  ]);
  const droppable = [...components].filter(
    (key) => recordLevel.has(key) || key === "generated",
  );
  if (droppable.length === 0) {
    throw new Error(
      `--drop only supports record-level --only components (${[...recordLevel].join(", ")}, generated). Catalog slices already replace in place.`,
    );
  }
}
