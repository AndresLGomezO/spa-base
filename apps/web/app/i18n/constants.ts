/**
 * i18n configuration constants and a small pure locale-normalization helper.
 */

export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE = "en" as const satisfies SupportedLocale;

export const NAMESPACES = ["common"] as const;
type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_NAMESPACE: Namespace = "common";

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  es: "Español",
};

export const LOCALE_STORAGE_KEY = "i18n-locale";

export function normalizeLocale(lng: string | undefined): SupportedLocale {
  if (!lng) return "en";
  const base = lng.split("-")[0];
  return SUPPORTED_LOCALES.includes(base as SupportedLocale)
    ? (base as SupportedLocale)
    : "en";
}
