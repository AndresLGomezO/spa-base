import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { SegmentedSwitch } from "@repo/ui";

import { loadLocale } from "../i18n";
import {
  LOCALE_STORAGE_KEY,
  localeDisplayName,
  normalizeLocale,
} from "../i18n/constants";
import { useTenantLocalePacks } from "../i18n/TenantLocalePacksProvider";

interface LanguageSwitcherProps {
  readonly className?: string;
  readonly fullWidth?: boolean;
}

/**
 * Locale switch. Options = platform locales ∪ tenant locale packs ∪ defaultLocale.
 * Lazy-loads platform common.json when available; otherwise falls back to English
 * platform strings while tenant packs still resolve labels.
 */
export function LanguageSwitcher({
  className,
  fullWidth = false,
}: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation("common");
  const { availableLocales } = useTenantLocalePacks();
  const effectiveLocale = normalizeLocale(i18n.language);

  const selectLocale = useCallback(
    async (locale: string) => {
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

  const options =
    availableLocales.length > 0 ? availableLocales : [effectiveLocale];

  return (
    <SegmentedSwitch
      value={effectiveLocale}
      onChange={(locale) => void selectLocale(locale)}
      ariaLabel={t("language.label")}
      fullWidth={fullWidth}
      className={className}
      options={options.map((code) => {
        const isActive = effectiveLocale === code;
        const label = localeDisplayName(code);

        return {
          value: code,
          ariaLabel: label,
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
                {label}
              </span>
            </span>
          ),
        };
      })}
    />
  );
}
