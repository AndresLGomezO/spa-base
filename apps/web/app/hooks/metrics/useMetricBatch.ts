import { useQuery } from "@tanstack/react-query";

import { fetchMetricBatch, type MetricRowQuery } from "../../lib/api-client.js";
import { chunkMetricQueries } from "../../lib/metric-query-utils.js";
import { metricBatchQueryKey } from "../../query/query-client.js";
import { useCanReadMetricValues } from "./useCanReadMetricValues.js";

async function fetchMetricBatchChunked(
  metricDefinitionId: string,
  queries: readonly MetricRowQuery[],
): Promise<readonly Awaited<ReturnType<typeof fetchMetricBatch>>[number][]> {
  const chunks = chunkMetricQueries(queries);
  const merged: Awaited<ReturnType<typeof fetchMetricBatch>>[number][] = [];

  for (const chunk of chunks) {
    const items = await fetchMetricBatch(metricDefinitionId, chunk);
    merged.push(...items);
  }

  return merged;
}

export function useMetricBatch(input: {
  readonly metricDefinitionId: string | undefined;
  readonly sourceModel?: string;
  readonly queries: readonly MetricRowQuery[] | null;
  readonly enabled?: boolean;
}) {
  const canRead = useCanReadMetricValues(input.sourceModel);
  const enabled =
    (input.enabled ?? true) &&
    canRead &&
    Boolean(input.metricDefinitionId?.trim()) &&
    input.queries !== null &&
    input.queries.length > 0;

  return useQuery({
    queryKey: metricBatchQueryKey(
      input.metricDefinitionId ?? "",
      input.queries,
    ),
    queryFn: () =>
      fetchMetricBatchChunked(input.metricDefinitionId!, input.queries!),
    enabled,
  });
}
