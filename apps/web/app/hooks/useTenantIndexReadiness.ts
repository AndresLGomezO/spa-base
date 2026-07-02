import { useQuery } from "@tanstack/react-query";

import { getTenantIndexProvisioningStatus } from "../lib/api-client";
import { pollIntervalForTenantIndexReadiness } from "./tenant-index-readiness-polling";

const TENANT_INDEX_READINESS_QUERY_KEY = "tenant-index-readiness" as const;

export function useTenantIndexReadiness(enabled = true) {
  const statusQuery = useQuery({
    queryKey: [TENANT_INDEX_READINESS_QUERY_KEY],
    queryFn: getTenantIndexProvisioningStatus,
    enabled,
    refetchInterval: (query) =>
      pollIntervalForTenantIndexReadiness(
        query.state.data?.phase,
        query.state.data?.creatingCount ?? 0,
        query.state.data?.errorCount ?? 0,
      ),
  });

  const summary = statusQuery.data;
  const phase = summary?.phase ?? "idle";
  const collections = summary?.collections ?? [];
  const totalCreatingCount =
    summary?.creatingCount ??
    collections.reduce(
      (total, collectionSummary) => total + collectionSummary.creatingCount,
      0,
    );

  return {
    isEnvironmentReady: summary?.isEnvironmentReady ?? true,
    phase,
    buildingCollections: summary?.buildingCollections ?? [],
    errorCollections: summary?.errorCollections ?? [],
    collections,
    indexes: summary?.indexes ?? [],
    totalIndexes: summary?.totalIndexes ?? 0,
    readyCount: summary?.readyCount ?? 0,
    errorCount: summary?.errorCount ?? 0,
    requiresManualActionCount: summary?.requiresManualActionCount ?? 0,
    totalCreatingCount,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
  };
}
