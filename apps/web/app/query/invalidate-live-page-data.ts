import type { QueryClient } from "@tanstack/react-query";

export async function invalidateLivePageData(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["entity"] }),
    queryClient.invalidateQueries({ queryKey: ["metric-row"] }),
    queryClient.invalidateQueries({ queryKey: ["entity-query-results"] }),
    queryClient.invalidateQueries({ queryKey: ["one-to-many-subfield"] }),
  ]);
}
