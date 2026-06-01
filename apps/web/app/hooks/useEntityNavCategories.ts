import { useQuery } from "@tanstack/react-query";

import { listEntityCategories } from "../lib/api-client";

export const entityCategoriesQueryKey = ["entity-categories"] as const;

export function useEntityNavCategories() {
  return useQuery({
    queryKey: entityCategoriesQueryKey,
    queryFn: async () => {
      const response = await listEntityCategories();
      return [...response.items].sort(
        (left, right) => left.order - right.order,
      );
    },
    staleTime: 30_000,
  });
}
