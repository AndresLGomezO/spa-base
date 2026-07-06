import { useQuery } from "@tanstack/react-query";

import { listEntityQueryDefinitions } from "../lib/api-client.js";
import { queryClient } from "../query/query-client.js";

const ENTITY_QUERY_DEFINITIONS_QUERY_KEY = [
  "entity-query-definitions",
] as const;

async function fetchEntityQueryDefinitions() {
  const result = await listEntityQueryDefinitions();
  return result.items;
}

export async function loadEntityQueryDefinitionsCached() {
  return queryClient.fetchQuery({
    queryKey: ENTITY_QUERY_DEFINITIONS_QUERY_KEY,
    queryFn: fetchEntityQueryDefinitions,
  });
}

export function useEntityQueryDefinitions(enabled = true) {
  return useQuery({
    queryKey: ENTITY_QUERY_DEFINITIONS_QUERY_KEY,
    queryFn: fetchEntityQueryDefinitions,
    enabled,
  });
}
