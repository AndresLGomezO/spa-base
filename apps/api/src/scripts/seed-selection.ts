/** Catalog slice keys for `pnpm seed:database -- --only …`. */
export const SEED_CATALOG_COMPONENTS = [
  "entities",
  "metrics",
  "queries",
  "hooks",
  "formulas",
  "charts",
  "custom-views",
] as const;

/** Local import entity names (JSON under `.local/tenant-import`). */
export const SEED_LOCAL_ENTITY_COMPONENTS = [
  "category",
  "actor",
  "account",
  "financialItem",
  "loanDetails",
  "loanMonthlyCost",
  "loanUtilization",
  "incomeDetails",
  "investmentDetails",
  "serviceDetails",
] as const;

/** Generated import entity names (under `.local/tenant-import/generated`). */
export const SEED_GENERATED_ENTITY_COMPONENTS = [
  "paymentSchedule",
  "transaction",
  "balanceSnapshot",
] as const;

export const SEED_OTHER_COMPONENTS = [
  "platform",
  "generated",
  "emailMatchBindings",
  "ui",
  "demo",
  "metrics-backfill",
  "hook-cache",
] as const;

export const SEED_COMPONENT_KEYS = [
  ...SEED_OTHER_COMPONENTS,
  ...SEED_CATALOG_COMPONENTS,
  ...SEED_LOCAL_ENTITY_COMPONENTS,
  ...SEED_GENERATED_ENTITY_COMPONENTS,
] as const;

export type SeedComponentKey = (typeof SEED_COMPONENT_KEYS)[number];

const SEED_COMPONENT_KEY_SET = new Set<string>(SEED_COMPONENT_KEYS);

/** Components that accept `--ids` filtering (record-level upserts). */
export const SEED_RECORD_LEVEL_COMPONENTS = new Set<string>([
  ...SEED_LOCAL_ENTITY_COMPONENTS,
  ...SEED_GENERATED_ENTITY_COMPONENTS,
  "emailMatchBindings",
]);

export interface SeedSelection {
  /** `null` = full seed (all components). */
  readonly components: ReadonlySet<SeedComponentKey> | null;
  /** `null` = no id filter. */
  readonly ids: ReadonlySet<string> | null;
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
): readonly string[] | undefined {
  if (selection.components === null) {
    return undefined;
  }
  return SEED_LOCAL_ENTITY_COMPONENTS.filter((name) =>
    selection.components!.has(name),
  );
}

export function listSelectedGeneratedEntityNames(
  selection: SeedSelection,
): readonly string[] | undefined {
  if (selection.components === null) {
    return undefined;
  }
  if (selection.components.has("generated")) {
    return [...SEED_GENERATED_ENTITY_COMPONENTS];
  }
  return SEED_GENERATED_ENTITY_COMPONENTS.filter((name) =>
    selection.components!.has(name),
  );
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
): asserts components is ReadonlySet<SeedComponentKey> {
  const unknown = [...components].filter(
    (key) => !SEED_COMPONENT_KEY_SET.has(key),
  );
  if (unknown.length > 0) {
    throw new Error(
      `Unknown --only component(s): ${unknown.join(", ")}. Allowed: ${SEED_COMPONENT_KEYS.join(", ")}.`,
    );
  }
  if (components.size === 0) {
    throw new Error("Missing value for --only (expected comma-separated components).");
  }
}

export function assertIdsAllowedForSelection(
  components: ReadonlySet<SeedComponentKey>,
  ids: ReadonlySet<string> | null,
): void {
  if (!ids || ids.size === 0) {
    return;
  }
  const recordLevel = [...components].filter((key) =>
    SEED_RECORD_LEVEL_COMPONENTS.has(key),
  );
  if (recordLevel.length === 0) {
    throw new Error(
      `--ids requires at least one record-level --only component (${[...SEED_RECORD_LEVEL_COMPONENTS].join(", ")}).`,
    );
  }
}
