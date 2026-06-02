import { useQuery } from "@tanstack/react-query";

import { usePermission } from "../../auth/usePermission.js";
import {
  fetchMetricRowOrNull,
  type MetricRowQuery,
} from "../../lib/api-client.js";
import { metricRowQueryKey } from "../../query/query-client.js";

export function useMetricRow(input: {
  readonly metricDefinitionId: string | undefined;
  readonly query: MetricRowQuery | null;
  readonly enabled?: boolean;
}) {
  const canRead = usePermission("metricValue.read");
  const enabled =
    (input.enabled ?? true) &&
    canRead &&
    Boolean(input.metricDefinitionId?.trim()) &&
    input.query !== null;

  return useQuery({
    queryKey: metricRowQueryKey(input.metricDefinitionId ?? "", input.query),
    queryFn: () =>
      fetchMetricRowOrNull(input.metricDefinitionId!, input.query!),
    enabled,
  });
}
