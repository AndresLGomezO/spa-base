import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { SegmentedSwitch } from "@repo/ui";

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
  readonly fullWidth?: boolean;
}

/**
 * Locale switch (EN | ES). Lazy-loads non-default locale on change and persists to localStorage.
 */
export function LanguageSwitcher({
  className,
  fullWidth = false,
}: LanguageSwitcherProps) {
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
    <SegmentedSwitch
      value={effectiveLocale}
      onChange={(locale) => void selectLocale(locale)}
      ariaLabel={t("language.label")}
      fullWidth={fullWidth}
      className={className}
      options={SUPPORTED_LOCALES.map((code) => {
        const isActive = effectiveLocale === code;

        return {
          value: code,
          ariaLabel: LOCALE_LABELS[code],
          label: (
            <span className="flex flex-col items-center leading-tight">
              <span className="text-xs font-semibold tracking-wide uppercase">
                {code}
              </span>
              <span
                className={
                  isActive
                    ? "text-[10px] font-medium"
                    : "text-[10px] font-medium invisible"
                }
              >
                {LOCALE_LABELS[code]}
              </span>
            </span>
          ),
        };
      })}
    />
  );
}
