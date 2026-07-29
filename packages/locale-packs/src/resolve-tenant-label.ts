import type { LocaleMessages } from "./types.js";

export type LocaleMessagesByLocale = Readonly<
  Record<string, LocaleMessages | undefined>
>;

function normalizeLocale(locale: string | null | undefined): string {
  const raw = (locale ?? "en").trim();
  if (!raw) return "en";
  return raw;
}

function baseLocale(locale: string): string {
  const base = locale.split("-")[0]?.trim();
  return base && base.length > 0 ? base : locale;
}

/**
 * Resolve a tenant-authored label for the active UI locale.
 *
 * Fallback chain: exact locale → language base → defaultLocale → `en` → `fallback`.
 */
export function resolveTenantLabel(
  messagesByLocale: LocaleMessagesByLocale,
  locale: string | null | undefined,
  key: string,
  fallback: string,
  defaultLocale: string | null | undefined = "en",
): string {
  const normalized = normalizeLocale(locale);
  const authoring = normalizeLocale(defaultLocale);
  const candidates = [
    normalized,
    baseLocale(normalized),
    authoring,
    baseLocale(authoring),
    "en",
  ] as const;

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    const value = messagesByLocale[candidate]?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

/**
 * Build a locale→messages map from persisted locale packs.
 */
export function indexLocalePackMessages(
  packs: readonly {
    readonly locale: string;
    readonly messages: LocaleMessages;
  }[],
): LocaleMessagesByLocale {
  const out: Record<string, LocaleMessages> = {};
  for (const pack of packs) {
    out[pack.locale] = pack.messages;
  }
  return out;
}
