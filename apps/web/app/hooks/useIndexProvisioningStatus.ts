import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getIndexProvisioningStatus,
  isHardIndexListError,
  isTransientIndexListError,
  type IndexProvisioningPhase,
  type IndexProvisioningStatusSummary,
} from "../lib/api-client";
import type { EntityName } from "../entities/entity-catalog";

const INDEX_STATUS_QUERY_KEY = "index-provisioning-status" as const;

function indexStatusQueryKey(collection: string) {
  return [INDEX_STATUS_QUERY_KEY, collection] as const;
}

function pollIntervalForPhase(
  phase: IndexProvisioningPhase | undefined,
): number | false {
  if (phase === "building") {
    return 5_000;
  }
  if (phase === "error") {
    return 15_000;
  }
  return false;
}

export function resolveEffectiveIndexPhase(
  statusPhase: IndexProvisioningPhase,
  listErrorCode: string | null | undefined,
): IndexProvisioningPhase {
  const hasHardListError =
    listErrorCode !== undefined &&
    listErrorCode !== null &&
    isHardIndexListError(listErrorCode);
  const hasTransientListError =
    listErrorCode !== undefined &&
    listErrorCode !== null &&
    isTransientIndexListError(listErrorCode);

  if (hasHardListError || statusPhase === "error") {
    return "error";
  }
  if (hasTransientListError || statusPhase === "building") {
    return "building";
  }
  return statusPhase;
}

interface UseIndexProvisioningStatusOptions {
  readonly entityName?: EntityName;
  readonly listErrorCode?: string | null;
  readonly enabled?: boolean;
}

export function useIndexProvisioningStatus(
  collection: string | undefined,
  options: UseIndexProvisioningStatusOptions = {},
) {
  const queryClient = useQueryClient();
  const previousPhaseRef = useRef<IndexProvisioningPhase | undefined>(
    undefined,
  );
  const enabled =
    options.enabled !== false &&
    collection !== undefined &&
    collection.length > 0;

  const listErrorCode = options.listErrorCode;
  const pollWhileListBlocked =
    listErrorCode !== undefined &&
    listErrorCode !== null &&
    isTransientIndexListError(listErrorCode);

  const statusQuery = useQuery({
    queryKey: collection
      ? indexStatusQueryKey(collection)
      : ["index-status-disabled"],
    queryFn: () => getIndexProvisioningStatus(collection!),
    enabled,
    refetchInterval: (query) => {
      if (pollWhileListBlocked) {
        return 5_000;
      }
      return pollIntervalForPhase(
        (query.state.data as IndexProvisioningStatusSummary | undefined)?.phase,
      );
    },
  });

  const phase = statusQuery.data?.phase ?? "idle";
  const effectivePhase = resolveEffectiveIndexPhase(phase, listErrorCode);

  useEffect(() => {
    const previous = previousPhaseRef.current;
    previousPhaseRef.current = effectivePhase;

    if (
      previous !== "ready" &&
      effectivePhase === "ready" &&
      options.entityName
    ) {
      void queryClient.invalidateQueries({
        queryKey: ["entity", options.entityName],
      });
    }
  }, [effectivePhase, options.entityName, queryClient]);

  const isBlocking =
    effectivePhase === "building" || effectivePhase === "error";

  return {
    summary: statusQuery.data,
    phase: effectivePhase,
    isBlocking,
    isLoading: statusQuery.isLoading,
    isFetching: statusQuery.isFetching,
    error: statusQuery.error,
    refresh: statusQuery.refetch,
  };
}
