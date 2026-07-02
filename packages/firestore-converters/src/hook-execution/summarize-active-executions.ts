import type { DataHookExecutionRecord } from "@repo/hooks";

import type { DataHookExecutionActiveCounts } from "./repository-contract.js";

export function summarizeActiveExecutions(
  records: readonly DataHookExecutionRecord[],
): DataHookExecutionActiveCounts {
  let pending = 0;
  let running = 0;
  let queuedPending = 0;
  let inlineRunning = 0;
  let deferredRunning = 0;
  let cloudRunning = 0;

  for (const record of records) {
    if (record.status === "pending") {
      pending += 1;
      if (record.executionMode === "queued") {
        queuedPending += 1;
      }
      continue;
    }

    if (record.status === "running") {
      running += 1;
      switch (record.executionMode) {
        case "sync":
          inlineRunning += 1;
          break;
        case "deferred":
          deferredRunning += 1;
          break;
        case "queued":
          cloudRunning += 1;
          break;
      }
    }
  }

  return {
    pending,
    running,
    queuedPending,
    inlineRunning,
    deferredRunning,
    cloudRunning,
  };
}
