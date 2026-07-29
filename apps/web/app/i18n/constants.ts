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

export function isPlatformSupportedLocale(
  locale: string,
): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

export function normalizeLocale(lng: string | undefined): string {
  if (!lng) return DEFAULT_LOCALE;
  const base = lng.split("-")[0]?.toLowerCase();
  return base && /^[a-z]{2}$/.test(base) ? base : DEFAULT_LOCALE;
}

export function localeDisplayName(locale: string): string {
  if (isPlatformSupportedLocale(locale)) {
    return LOCALE_LABELS[locale];
  }
  try {
    return (
      new Intl.DisplayNames(undefined, { type: "language" }).of(locale) ??
      locale
    );
  } catch {
    return locale;
  }
}
