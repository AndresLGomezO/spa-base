import { useQuery } from "@tanstack/react-query";

import { getTenantIndexProvisioningStatus } from "../lib/api-client";

const TENANT_INDEX_READINESS_QUERY_KEY = "tenant-index-readiness" as const;

function pollIntervalForPhase(phase: string | undefined): number | false {
  if (phase === "building") {
    return 5_000;
  }
  return false;
}

export function useTenantIndexReadiness(enabled = true) {
  const statusQuery = useQuery({
    queryKey: [TENANT_INDEX_READINESS_QUERY_KEY],
    queryFn: getTenantIndexProvisioningStatus,
    enabled,
    refetchInterval: (query) => pollIntervalForPhase(query.state.data?.phase),
  });

  const summary = statusQuery.data;
  const phase = summary?.phase ?? "idle";
  const collections = summary?.collections ?? [];
  const totalCreatingCount = collections.reduce(
    (total, collectionSummary) => total + collectionSummary.creatingCount,
    0,
  );

  return {
    isEnvironmentReady: summary?.isEnvironmentReady ?? true,
    phase,
    buildingCollections: summary?.buildingCollections ?? [],
    errorCollections: summary?.errorCollections ?? [],
    collections,
    totalCreatingCount,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
  };
}
