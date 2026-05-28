import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { loadLocale } from "../i18n";
import { normalizeLocale } from "../i18n/constants";

/**
 * Syncs document lang and eagerly loads non-default locale bundles when needed.
 */
export function I18nSync() {
  const { i18n } = useTranslation("common");

  useEffect(() => {
    const locale = normalizeLocale(i18n.language);
    document.documentElement.lang = locale;

    if (locale !== "en") {
      void loadLocale(locale);
    }
  }, [i18n.language]);

  return null;
}
