import type { QueryClient } from "@tanstack/react-query";

/**
 * Marks live dashboard queries stale and refetches them. The returned promise
 * resolves after refetches finish, so callers must not await this before
 * closing UI — use `void invalidateLivePageData(queryClient)` instead.
 */
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
