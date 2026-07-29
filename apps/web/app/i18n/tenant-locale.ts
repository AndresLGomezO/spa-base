import {
  indexLocalePackMessages,
  resolveTenantLabel,
  type LocaleMessagesByLocale,
} from "@repo/locale-packs/browser";
import type { LocalePack } from "@repo/locale-packs/types";

export { indexLocalePackMessages, type LocaleMessagesByLocale };

export function createTenantLabelResolver(
  packs: readonly LocalePack[],
  locale: string | null | undefined,
  defaultLocale: string | null | undefined = "en",
): (key: string, fallback: string) => string {
  const messagesByLocale = indexLocalePackMessages(packs);
  return (key, fallback) =>
    resolveTenantLabel(messagesByLocale, locale, key, fallback, defaultLocale);
}
