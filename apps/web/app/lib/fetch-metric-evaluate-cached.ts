import { fetchMetricEvaluateOrNull } from "./api-client.js";
import { metricEvaluateQueryKey, queryClient } from "../query/query-client.js";

export async function fetchMetricEvaluateCached(
  metricDefinitionId: string,
  parameters: Readonly<Record<string, string | number | boolean>>,
  options: { readonly force?: boolean } = {},
): Promise<Awaited<ReturnType<typeof fetchMetricEvaluateOrNull>>> {
  return queryClient.fetchQuery({
    queryKey: metricEvaluateQueryKey(metricDefinitionId, parameters),
    queryFn: () => fetchMetricEvaluateOrNull(metricDefinitionId, parameters),
    ...(options.force ? { staleTime: 0 } : {}),
  });
}
