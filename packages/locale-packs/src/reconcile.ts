import type { HarvestedMessages } from "./harvest-record-walkers.js";
import type { LocalePack } from "./types.js";

export interface LocaleReconciliationDiff {
  readonly toAdd: readonly string[];
  readonly toRemove: readonly string[];
  readonly toKeep: readonly string[];
}

export interface ReconciliationPlan {
  readonly defaultLocale: string;
  readonly harvestedKeys: readonly string[];
  readonly locales: readonly string[];
  readonly perLocale: Readonly<Record<string, LocaleReconciliationDiff>>;
  /** Messages to write per locale after reconciliation. */
  readonly nextMessages: Readonly<Record<string, HarvestedMessages>>;
  readonly counts: {
    readonly added: number;
    readonly removed: number;
    readonly kept: number;
  };
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

/**
 * Compute a reconciliation plan that:
 * - Adds newly harvested keys (default locale gets harvested text; mirrors get "")
 * - Removes keys no longer present in harvested set
 * - Keeps existing non-empty translations for surviving keys
 */
export function computeReconciliationPlan(input: {
  readonly harvested: HarvestedMessages;
  readonly existing: readonly Pick<LocalePack, "locale" | "messages">[];
  readonly defaultLocale: string;
  readonly extraLocales?: readonly string[];
}): ReconciliationPlan {
  const defaultLocale = input.defaultLocale.trim() || "en";
  const harvestedKeys = Object.keys(input.harvested).sort((a, b) =>
    a.localeCompare(b),
  );
  const harvestedSet = new Set(harvestedKeys);

  const locales = sortedUnique([
    defaultLocale,
    ...input.existing.map((pack) => pack.locale),
    ...(input.extraLocales ?? []),
  ]);

  const existingByLocale = new Map(
    input.existing.map((pack) => [pack.locale, pack.messages] as const),
  );

  const perLocale: Record<string, LocaleReconciliationDiff> = {};
  const nextMessages: Record<string, HarvestedMessages> = {};
  let added = 0;
  let removed = 0;
  let kept = 0;

  for (const locale of locales) {
    const existingMessages = existingByLocale.get(locale) ?? {};
    const existingKeys = Object.keys(existingMessages);
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    const toKeep: string[] = [];
    const next: HarvestedMessages = {};

    for (const key of harvestedKeys) {
      const existingValue = existingMessages[key];
      const hasExisting =
        typeof existingValue === "string" && existingValue.trim().length > 0;

      if (locale === defaultLocale) {
        next[key] = input.harvested[key] ?? "";
        if (!(key in existingMessages)) {
          toAdd.push(key);
        } else {
          toKeep.push(key);
        }
        continue;
      }

      if (hasExisting) {
        next[key] = existingValue;
        toKeep.push(key);
      } else if (key in existingMessages) {
        // Present but empty — keep empty slot
        next[key] = "";
        toKeep.push(key);
      } else {
        next[key] = "";
        toAdd.push(key);
      }
    }

    for (const key of existingKeys) {
      if (!harvestedSet.has(key)) {
        toRemove.push(key);
      }
    }

    perLocale[locale] = {
      toAdd: toAdd.sort((a, b) => a.localeCompare(b)),
      toRemove: toRemove.sort((a, b) => a.localeCompare(b)),
      toKeep: toKeep.sort((a, b) => a.localeCompare(b)),
    };
    nextMessages[locale] = next;
    added += toAdd.length;
    removed += toRemove.length;
    kept += toKeep.length;
  }

  return {
    defaultLocale,
    harvestedKeys,
    locales,
    perLocale,
    nextMessages,
    counts: { added, removed, kept },
  };
}
