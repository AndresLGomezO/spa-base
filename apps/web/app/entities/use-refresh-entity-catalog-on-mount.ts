import { useEffect } from "react";

import { entityCatalogQueryKey, queryClient } from "../query/query-client";

/** Refetch catalog on mount only when cache is stale (avoids extra API calls). */
export function useRefreshEntityCatalogOnMount(): void {
  useEffect(() => {
    void queryClient.refetchQueries({
      queryKey: entityCatalogQueryKey,
      type: "active",
      stale: true,
    });
  }, []);
}
