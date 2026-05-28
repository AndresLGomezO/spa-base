import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { loadLocale } from "../i18n";
import {
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  normalizeLocale,
  type SupportedLocale,
} from "../i18n/constants";

interface LanguageSwitcherProps {
  readonly className?: string;
}

/**
 * Locale switch (EN | ES). Lazy-loads non-default locale on change and persists to localStorage.
 */
export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation("common");
  const effectiveLocale = normalizeLocale(i18n.language);

  const selectLocale = useCallback(
    async (locale: SupportedLocale) => {
      if (locale === effectiveLocale) return;

      const previousLocale = effectiveLocale;
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);

      try {
        await loadLocale(locale);
        await i18n.changeLanguage(locale);
      } catch {
        localStorage.setItem(LOCALE_STORAGE_KEY, previousLocale);
      }
    },
    [effectiveLocale, i18n],
  );

  return (
    <div
      className={
        className ?? "border-border bg-muted/50 flex rounded-md border p-0.5"
      }
      role="group"
      aria-label={t("language.label")}
    >
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => void selectLocale(code)}
          className={
            effectiveLocale === code
              ? "bg-background text-foreground min-w-0 flex-1 rounded px-2.5 py-1 text-xs font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground min-w-0 flex-1 rounded px-2.5 py-1 text-xs font-medium transition-colors"
          }
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
