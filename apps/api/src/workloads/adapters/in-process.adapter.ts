import {
  WORKLOAD_REGISTRY,
  type WorkloadWithState,
} from "@repo/workload-registry";

export function createInProcessAdapter() {
  return {
    list(): WorkloadWithState[] {
      return WORKLOAD_REGISTRY.filter(
        (w) => w.kind === "inProcessScheduler",
      ).map((w) => ({
        ...w,
        state: {
          status: "running" as const,
          live: { sourceFile: w.sourceFile },
          fetchedAt: new Date().toISOString(),
        },
      }));
    },
  };
}

export type InProcessAdapter = ReturnType<typeof createInProcessAdapter>;
