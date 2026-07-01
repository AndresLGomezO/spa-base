import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthContext";
import { listCustomViews, type CustomViewRecord } from "../lib/api-client";
import { fetchWithTenantNotResolvedRetry } from "../lib/fetch-with-tenant-not-resolved-retry";
import { queryClient } from "../query/query-client";

interface CustomViewCatalogContextValue {
  readonly items: readonly CustomViewRecord[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly getByViewId: (viewId: string) => CustomViewRecord | undefined;
}

const CustomViewCatalogContext =
  createContext<CustomViewCatalogContextValue | null>(null);

function customViewCatalogQueryKey(tenantId: string | null) {
  return ["custom-views", tenantId ?? "none"] as const;
}

export function CustomViewCatalogProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const { tenantId, isSessionResolved } = useAuth();
  const catalogQuery = useQuery({
    queryKey: customViewCatalogQueryKey(tenantId),
    queryFn: () => fetchWithTenantNotResolvedRetry(listCustomViews),
    staleTime: 30_000,
    enabled: isSessionResolved && Boolean(tenantId),
    refetchOnWindowFocus: true,
  });

  const isLoading =
    isSessionResolved && Boolean(tenantId) ? catalogQuery.isLoading : false;
  const error =
    catalogQuery.error instanceof Error
      ? catalogQuery.error.message
      : catalogQuery.error
        ? "Failed to load custom views."
        : null;

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["custom-views"],
    });
  }, []);

  const value = useMemo<CustomViewCatalogContextValue>(() => {
    const items = catalogQuery.data?.items ?? [];
    const normalizedIndex = new Map(
      items.map((item) => [item.viewId.toLowerCase(), item]),
    );

    return {
      items,
      isLoading,
      error,
      refresh,
      getByViewId: (viewId) => normalizedIndex.get(viewId.toLowerCase()),
    };
  }, [catalogQuery.data?.items, error, isLoading, refresh]);

  return (
    <CustomViewCatalogContext.Provider value={value}>
      {children}
    </CustomViewCatalogContext.Provider>
  );
}

export function useCustomViewCatalog(): CustomViewCatalogContextValue {
  const context = useContext(CustomViewCatalogContext);
  if (!context) {
    throw new Error(
      "useCustomViewCatalog must be used within CustomViewCatalogProvider.",
    );
  }
  return context;
}

export function useCustomViewByViewId(viewId: string): {
  readonly customView: CustomViewRecord | undefined;
  readonly isLoading: boolean;
  readonly error: string | null;
} {
  const { getByViewId, isLoading, error } = useCustomViewCatalog();
  return {
    customView: getByViewId(viewId),
    isLoading,
    error,
  };
}
