import { useQuery } from "@tanstack/react-query";

import { listMetricDefinitions } from "../../lib/api-client.js";

const ACTIVE_METRIC_DEFINITIONS_QUERY_KEY = [
  "metric-definitions",
  "active",
] as const;

export function useActiveMetricDefinitions(enabled = true) {
  return useQuery({
    queryKey: ACTIVE_METRIC_DEFINITIONS_QUERY_KEY,
    queryFn: async () => {
      const result = await listMetricDefinitions();
      return result.items.filter((item) => item.status === "ACTIVE");
    },
    enabled,
  });
}
