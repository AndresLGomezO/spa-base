import { useCallback, useEffect, useMemo, useState } from "react";

import type { AiJobRecord } from "../../lib/api-client";
import {
  clearActiveUiBuilderJobId,
  readActiveUiBuilderJobId,
  readLastUiBuilderRun,
  writeActiveUiBuilderJobId,
  writeLastUiBuilderRun,
  type UiBuilderAiJobStorageScope,
  type UiBuilderLastRun,
} from "./ui-builder-ai-job-storage";
import { useAiUiBuilderJob } from "./use-ai-ui-builder";

function isTerminalStatus(status: AiJobRecord["status"]): boolean {
  return status === "completed" || status === "failed";
}

function buildStorageScope(
  tenantId: string | null | undefined,
  entityName: string,
  surface: string,
): UiBuilderAiJobStorageScope | null {
  const parsedTenantId = tenantId?.trim();
  const parsedEntityName = entityName.trim();
  const parsedSurface = surface.trim();
  if (!parsedTenantId || !parsedEntityName || !parsedSurface) {
    return null;
  }

  return {
    tenantId: parsedTenantId,
    entityName: parsedEntityName,
    surface: parsedSurface,
  };
}

export function usePersistedUiBuilderAiJob(
  tenantId: string | null | undefined,
  entityName: string,
  surface = "list",
) {
  const storageScope = useMemo(
    () => buildStorageScope(tenantId, entityName, surface),
    [tenantId, entityName, surface],
  );

  const [activeJobId, setActiveJobIdState] = useState<string | null>(() => {
    if (!storageScope) {
      return null;
    }
    return readActiveUiBuilderJobId(storageScope);
  });
  const [lastRun, setLastRunState] = useState<UiBuilderLastRun | null>(() => {
    if (!storageScope) {
      return null;
    }
    return readLastUiBuilderRun(storageScope);
  });

  useEffect(() => {
    if (!storageScope) {
      setActiveJobIdState(null);
      setLastRunState(null);
      return;
    }

    const storedJobId = readActiveUiBuilderJobId(storageScope);
    setActiveJobIdState(storedJobId);
    setLastRunState(readLastUiBuilderRun(storageScope));
  }, [storageScope]);

  const setActiveJobId = useCallback(
    (jobId: string | null) => {
      setActiveJobIdState(jobId);
      if (!storageScope) {
        return;
      }
      if (jobId) {
        writeActiveUiBuilderJobId(storageScope, jobId);
        return;
      }
      clearActiveUiBuilderJobId(storageScope);
    },
    [storageScope],
  );

  const { job, isWorking, isError, error } = useAiUiBuilderJob(activeJobId);

  useEffect(() => {
    if (!storageScope || !job || !activeJobId) {
      return;
    }
    if (!isTerminalStatus(job.status)) {
      return;
    }

    const nextLastRun: UiBuilderLastRun = {
      jobId: activeJobId,
      status: job.status === "completed" ? "completed" : "failed",
      ...(job.error ? { error: job.error } : {}),
      finishedAt: job.updatedAt,
    };
    writeLastUiBuilderRun(storageScope, nextLastRun);
    setLastRunState(nextLastRun);
    clearActiveUiBuilderJobId(storageScope);
    setActiveJobIdState(null);
  }, [activeJobId, job, storageScope]);

  return {
    activeJobId,
    setActiveJobId,
    job,
    lastRun,
    isWorking,
    hasActiveJob: isWorking,
    isError,
    error,
  };
}
