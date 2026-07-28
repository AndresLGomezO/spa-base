import type { WorkloadRunRepository } from "@repo/workload-runs";

export function createWorkloadRunsAdapter(repository: WorkloadRunRepository) {
  return {
    repository,
  };
}

export type WorkloadRunsAdapter = ReturnType<typeof createWorkloadRunsAdapter>;
