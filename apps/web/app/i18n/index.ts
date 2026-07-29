/**
 * i18next initialization. Single import to bootstrap i18n.
 * En locale is bundled; other locales are lazy-loaded via loadLocale().
 */

import "./types";

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import {
  DEFAULT_LOCALE,
  DEFAULT_NAMESPACE,
  LOCALE_STORAGE_KEY,
  NAMESPACES,
  isPlatformSupportedLocale,
  type SupportedLocale,
} from "./constants";

import enCommon from "./locales/en/common.json";

const enResources = {
  common: enCommon,
};

const loadedLocales = new Set<string>(["en"]);

const lazyCommonByLocale = {
  es: () => import("./locales/es/common.json"),
} satisfies Record<
  Exclude<SupportedLocale, typeof DEFAULT_LOCALE>,
  () => Promise<{ default: typeof enCommon }>
>;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LOCALE,
    // Do not hard-limit to SUPPORTED_LOCALES — tenant packs may add it, fr, etc.
    supportedLngs: false,
    defaultNS: DEFAULT_NAMESPACE,
    ns: [...NAMESPACES],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
    },
    resources: {
      en: enResources,
    },
  });

export { i18n };

/**
 * Lazy-load a locale's namespace bundles and add to i18n.
 * Platform-unsupported locales fall back to the English common bundle
 * so tenant labels can still switch via locale packs.
 */
export async function loadLocale(locale: string): Promise<void> {
  const normalized = locale.split("-")[0]?.toLowerCase() || DEFAULT_LOCALE;
  if (loadedLocales.has(normalized)) return;
  if (normalized === DEFAULT_LOCALE) {
    loadedLocales.add(normalized);
    return;
  }

  if (isPlatformSupportedLocale(normalized) && normalized !== DEFAULT_LOCALE) {
    const loader = lazyCommonByLocale[normalized];
    if (loader) {
      const common = await loader().then((m) => m.default);
      i18n.addResourceBundle(normalized, "common", common, true, true);
      loadedLocales.add(normalized);
      return;
    }
  }

  // Tenant-only locale: re-use English platform strings.
  i18n.addResourceBundle(normalized, "common", enCommon, true, true);
  loadedLocales.add(normalized);
}
