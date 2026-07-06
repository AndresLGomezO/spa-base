import { useQuery } from "@tanstack/react-query";

import { listChartDefinitions } from "../lib/api-client.js";

const CHART_DEFINITIONS_QUERY_KEY = ["chart-definitions"] as const;

async function fetchChartDefinitions() {
  const result = await listChartDefinitions();
  return result.items;
}

export function useChartDefinitions(enabled = true) {
  return useQuery({
    queryKey: CHART_DEFINITIONS_QUERY_KEY,
    queryFn: fetchChartDefinitions,
    enabled,
  });
}
