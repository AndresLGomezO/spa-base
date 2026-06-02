import { useQuery } from "@tanstack/react-query";

import { getMetricDefinition } from "../../lib/api-client.js";
import { metricDefinitionQueryKey } from "../../query/query-client.js";

export function useMetricDefinition(metricDefinitionId: string | undefined) {
  return useQuery({
    queryKey: metricDefinitionQueryKey(metricDefinitionId ?? ""),
    queryFn: () => getMetricDefinition(metricDefinitionId!),
    enabled: Boolean(metricDefinitionId?.trim()),
  });
}
