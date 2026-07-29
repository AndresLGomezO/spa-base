import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type { LocalePack } from "@repo/locale-packs/types";

import { useAuth } from "../auth/AuthContext";
import { listLocalePacks } from "../lib/api-client";
import { fetchWithTenantNotResolvedRetry } from "../lib/fetch-with-tenant-not-resolved-retry";
import { SUPPORTED_LOCALES } from "./constants";
import {
  createTenantLabelResolver,
  indexLocalePackMessages,
  type LocaleMessagesByLocale,
} from "./tenant-locale";

interface TenantLocalePacksContextValue {
  readonly packs: readonly LocalePack[];
  readonly messagesByLocale: LocaleMessagesByLocale;
  readonly isLoading: boolean;
  readonly locale: string;
  readonly defaultLocale: string;
  readonly availableLocales: readonly string[];
  readonly tTenant: (key: string, fallback: string) => string;
}

const TenantLocalePacksContext =
  createContext<TenantLocalePacksContextValue | null>(null);

export const localePacksQueryKey = ["locale-packs"] as const;

function localePacksQueryKeyForTenant(tenantId: string) {
  return [...localePacksQueryKey, tenantId] as const;
}

function uniqSortedLocales(locales: readonly string[]): string[] {
  return [...new Set(locales.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function TenantLocalePacksProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const { tenantId, isSessionResolved } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language?.split("-")[0] || "en";

  const packsQuery = useQuery({
    queryKey: tenantId
      ? localePacksQueryKeyForTenant(tenantId)
      : localePacksQueryKey,
    queryFn: async () => {
      return fetchWithTenantNotResolvedRetry(listLocalePacks);
    },
    staleTime: 60_000,
    enabled: isSessionResolved && Boolean(tenantId),
    refetchOnWindowFocus: true,
  });

  const packs = useMemo(
    () => packsQuery.data?.items ?? [],
    [packsQuery.data?.items],
  );
  const defaultLocale = packsQuery.data?.defaultLocale?.trim() || "en";
  const messagesByLocale = useMemo(
    () => indexLocalePackMessages(packs),
    [packs],
  );

  const availableLocales = useMemo(
    () =>
      uniqSortedLocales([
        ...SUPPORTED_LOCALES,
        defaultLocale,
        ...packs.map((pack) => pack.locale),
      ]),
    [packs, defaultLocale],
  );

  const tTenant = useCallback(
    (key: string, fallback: string) =>
      createTenantLabelResolver(packs, locale, defaultLocale)(key, fallback),
    [packs, locale, defaultLocale],
  );

  const value = useMemo<TenantLocalePacksContextValue>(
    () => ({
      packs,
      messagesByLocale,
      isLoading: Boolean(tenantId) && packsQuery.isLoading,
      locale,
      defaultLocale,
      availableLocales,
      tTenant,
    }),
    [
      packs,
      messagesByLocale,
      packsQuery.isLoading,
      tenantId,
      locale,
      defaultLocale,
      availableLocales,
      tTenant,
    ],
  );

  return (
    <TenantLocalePacksContext.Provider value={value}>
      {children}
    </TenantLocalePacksContext.Provider>
  );
}

export function useTenantLocalePacks(): TenantLocalePacksContextValue {
  const context = useContext(TenantLocalePacksContext);
  if (!context) {
    return {
      packs: [],
      messagesByLocale: {},
      isLoading: false,
      locale: "en",
      defaultLocale: "en",
      availableLocales: [...SUPPORTED_LOCALES],
      tTenant: (_key, fallback) => fallback,
    };
  }
  return context;
}

export function useTenantLabel(): (key: string, fallback: string) => string {
  return useTenantLocalePacks().tTenant;
}
