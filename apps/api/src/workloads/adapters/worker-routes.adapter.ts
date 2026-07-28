import {
  WORKLOAD_REGISTRY,
  type WorkloadWithState,
} from "@repo/workload-registry";

export function createWorkerRoutesAdapter() {
  return {
    list(): WorkloadWithState[] {
      return WORKLOAD_REGISTRY.filter((w) => w.kind === "workerRoute").map(
        (w) => ({
          ...w,
          state: {
            // Catalog entry only — not live job state.
            status: "unknown" as const,
            live: { route: w.route },
            fetchedAt: new Date().toISOString(),
          },
        }),
      );
    },
  };
}

export type WorkerRoutesAdapter = ReturnType<typeof createWorkerRoutesAdapter>;
