import { useQuery } from "@tanstack/react-query";

import {
  fetchMetricEvaluateOrNull,
  type MetricDefinitionRecord,
} from "../../lib/api-client.js";
import { metricEvaluateQueryKey } from "../../query/query-client.js";
import { useCanReadMetricValues } from "./useCanReadMetricValues.js";

export function useMetricEvaluate(input: {
  readonly metricDefinitionId: string | undefined;
  readonly definition: MetricDefinitionRecord | undefined;
  readonly parameters: Record<string, string | number | boolean> | null;
  readonly enabled?: boolean;
}) {
  const canRead = useCanReadMetricValues(input.definition?.sourceModel);
  const enabled =
    (input.enabled ?? true) &&
    canRead &&
    Boolean(input.metricDefinitionId?.trim()) &&
    input.definition?.computationMode === "computed" &&
    input.parameters !== null;

  return useQuery({
    queryKey: metricEvaluateQueryKey(
      input.metricDefinitionId ?? "",
      input.parameters,
    ),
    queryFn: () =>
      fetchMetricEvaluateOrNull(input.metricDefinitionId!, input.parameters!),
    enabled,
  });
}
