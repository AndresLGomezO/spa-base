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
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "./constants";

import enCommon from "./locales/en/common.json";

const enResources = {
  common: enCommon,
};

const loadedLocales = new Set<SupportedLocale>(["en"]);

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
    supportedLngs: [...SUPPORTED_LOCALES],
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
 * Lazy-load a locale's namespace bundles and add to i18n. Idempotent per locale.
 */
export async function loadLocale(locale: SupportedLocale): Promise<void> {
  if (loadedLocales.has(locale)) return;
  if (locale === DEFAULT_LOCALE) return;

  const common = await lazyCommonByLocale[locale]().then((m) => m.default);

  i18n.addResourceBundle(locale, "common", common, true, true);

  loadedLocales.add(locale);
}
