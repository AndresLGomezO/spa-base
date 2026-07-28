import {
  WORKLOAD_REGISTRY,
  type WorkloadRecord,
  type WorkloadWithState,
} from "@repo/workload-registry";

export function createWorkerRoutesAdapter() {
  return {
    list(): WorkloadWithState[] {
      return WORKLOAD_REGISTRY.filter((w) => w.kind === "workerRoute").map(
        (w) => ({
          ...w,
          state: {
            status: "running" as const,
            live: { route: w.route },
            fetchedAt: new Date().toISOString(),
          },
        }),
      );
    },
  };
}

export type WorkerRoutesAdapter = ReturnType<typeof createWorkerRoutesAdapter>;
