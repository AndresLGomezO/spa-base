import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useAuth } from "../auth/AuthContext";
import { useTenantLabel } from "../i18n/TenantLocalePacksProvider";
import { listEntityCategories } from "../lib/api-client";
import { fetchWithTenantNotResolvedRetry } from "../lib/fetch-with-tenant-not-resolved-retry";
import {
  entityCategoriesQueryKey,
  entityCategoriesQueryKeyForTenant,
} from "../query/query-client";

export { entityCategoriesQueryKey } from "../query/query-client";

export function useEntityNavCategories() {
  const { tenantId, isSessionResolved } = useAuth();
  const tTenant = useTenantLabel();

  const query = useQuery({
    queryKey: tenantId
      ? entityCategoriesQueryKeyForTenant(tenantId)
      : entityCategoriesQueryKey,
    queryFn: async () => {
      const response =
        await fetchWithTenantNotResolvedRetry(listEntityCategories);
      return [...response.items].sort(
        (left, right) => left.order - right.order,
      );
    },
    staleTime: 30_000,
    enabled: isSessionResolved && Boolean(tenantId),
    refetchOnWindowFocus: true,
  });

  const data = useMemo(() => {
    if (!query.data) return query.data;
    return query.data.map((category) => ({
      ...category,
      name: tTenant(`entityCategory.${category.id}.name`, category.name),
    }));
  }, [query.data, tTenant]);

  return { ...query, data };
}
