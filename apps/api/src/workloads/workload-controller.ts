import {
  getWorkloadById,
  listWorkloads as listRegistryWorkloads,
  SCHEDULED_HOOK_WORKLOAD_ID_PREFIX,
  type WorkloadAction,
  type WorkloadRecord,
  type WorkloadStateSnapshot,
  type WorkloadWithState,
} from "@repo/workload-registry";
import type { WorkloadRunRepository, WorkloadRunRecord } from "@repo/workload-runs";

import type { CloudTasksAdminAdapter } from "./adapters/cloud-tasks-admin.adapter.js";
import type { SchedulerAdminAdapter } from "./adapters/scheduler-admin.adapter.js";
import type { PubSubAdminAdapter } from "./adapters/pubsub-admin.adapter.js";
import type { ScheduledHooksAdapter } from "./adapters/scheduled-hooks.adapter.js";
import type { WorkerRoutesAdapter } from "./adapters/worker-routes.adapter.js";
import type { InProcessAdapter } from "./adapters/in-process.adapter.js";
import type { CloudLoggingAdapter } from "./adapters/cloud-logging.adapter.js";

export interface WorkloadControllerDeps {
  readonly cloudTasks: CloudTasksAdminAdapter;
  readonly scheduler: SchedulerAdminAdapter;
  readonly pubsub: PubSubAdminAdapter;
  readonly scheduledHooks: ScheduledHooksAdapter;
  readonly workerRoutes: WorkerRoutesAdapter;
  readonly inProcess: InProcessAdapter;
  readonly cloudLogging: CloudLoggingAdapter;
  readonly runs: WorkloadRunRepository;
  readonly queueNameByEnvKey: Record<string, string>;
  readonly schedulerJobNameByResource: Record<string, string>;
  readonly localMode: boolean;
  readonly projectId: string;
  readonly audit?: {
    write: (event: Record<string, unknown>) => Promise<void>;
  };
}

export function createWorkloadController(deps: WorkloadControllerDeps) {
  function resolveQueueName(workload: WorkloadRecord): string | null {
    const envKey = workload.gcp?.envKey;
    if (!envKey) return null;
    return deps.queueNameByEnvKey[envKey] ?? null;
  }

  function resolveSchedulerJobName(workload: WorkloadRecord): string | null {
    const resourceName = workload.gcp?.resourceName;
    if (!resourceName) return null;
    return deps.schedulerJobNameByResource[resourceName] ?? null;
  }

  function resolveSubscriptionName(workload: WorkloadRecord): string | null {
    return workload.gcp?.resourceName ?? null;
  }

  async function fetchState(
    workload: WorkloadRecord,
  ): Promise<WorkloadStateSnapshot> {
    const now = new Date().toISOString();

    try {
      switch (workload.kind) {
        case "cloudTasksQueue": {
          const queueName = resolveQueueName(workload);
          if (!queueName)
            return { status: "unknown", live: {}, fetchedAt: now };
          const state = await deps.cloudTasks.getState(queueName);
          return { ...state, fetchedAt: now };
        }
        case "schedulerJob": {
          const jobName = resolveSchedulerJobName(workload);
          if (!jobName)
            return { status: "unknown", live: {}, fetchedAt: now };
          const state = await deps.scheduler.getState(jobName);
          return { ...state, fetchedAt: now };
        }
        case "pubsubSubscription": {
          const subName = resolveSubscriptionName(workload);
          if (!subName)
            return { status: "unknown", live: {}, fetchedAt: now };
          const state = await deps.pubsub.getState(subName);
          return { ...state, fetchedAt: now };
        }
        case "scheduledDataHook":
          return { status: "running", live: {}, fetchedAt: now };
        case "workerRoute":
          return {
            status: "running",
            live: { route: workload.route },
            fetchedAt: now,
          };
        case "inProcessScheduler":
          return {
            status: "running",
            live: { sourceFile: workload.sourceFile },
            fetchedAt: now,
          };
        default:
          return { status: "unknown", live: {}, fetchedAt: now };
      }
    } catch (err) {
      return {
        status: "unknown",
        live: {},
        fetchedAt: now,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    async listWorkloads(filters?: {
      kind?: string[];
      source?: string[];
      status?: string;
      q?: string;
    }): Promise<WorkloadWithState[]> {
      let registryWorkloads = listRegistryWorkloads({
        kind: filters?.kind,
        source: filters?.source,
        q: filters?.q,
      }) as WorkloadRecord[];

      let hookWorkloads: WorkloadRecord[] = [];
      const includeHooks =
        !filters?.kind ||
        filters.kind.length === 0 ||
        filters.kind.includes("scheduledDataHook");
      if (includeHooks) {
        try {
          hookWorkloads = await deps.scheduledHooks.list();
        } catch {
          hookWorkloads = [];
        }
      }

      let allWorkloads = [...registryWorkloads, ...hookWorkloads];

      if (filters?.q?.trim()) {
        const q = filters.q.trim().toLowerCase();
        allWorkloads = allWorkloads.filter(
          (w) =>
            w.id.toLowerCase().includes(q) ||
            w.displayName.toLowerCase().includes(q) ||
            w.description.toLowerCase().includes(q),
        );
      }

      const results = await Promise.allSettled(
        allWorkloads.map(async (w) => {
          const state = await fetchState(w);
          return { ...w, state } as WorkloadWithState;
        }),
      );

      let workloads = results
        .filter(
          (r): r is PromiseFulfilledResult<WorkloadWithState> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value);

      if (filters?.status) {
        workloads = workloads.filter(
          (w) => w.state.status === filters.status,
        );
      }

      return workloads;
    },

    async getWorkload(
      id: string,
    ): Promise<
      | (WorkloadWithState & { runStats?: Record<string, number> })
      | null
    > {
      let workload: WorkloadRecord | undefined;

      if (id.startsWith(SCHEDULED_HOOK_WORKLOAD_ID_PREFIX)) {
        const hookWorkloads = await deps.scheduledHooks.list();
        workload = hookWorkloads.find((w) => w.id === id);
      } else {
        workload = getWorkloadById(id);
      }

      if (!workload) return null;

      const state = await fetchState(workload);

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      let runStats: Record<string, number> | undefined;
      try {
        runStats = await deps.runs.countByWorkloadIdSince(id, since);
      } catch {
        runStats = undefined;
      }

      return { ...workload, state, runStats };
    },

    async applyAction(
      id: string,
      action: string,
      actor?: string,
    ): Promise<void> {
      let workload: WorkloadRecord | undefined;

      if (id.startsWith(SCHEDULED_HOOK_WORKLOAD_ID_PREFIX)) {
        const hookWorkloads = await deps.scheduledHooks.list();
        workload = hookWorkloads.find((w) => w.id === id);
      } else {
        workload = getWorkloadById(id);
      }

      if (!workload) {
        throw new WorkloadNotFoundError(id);
      }

      if (!workload.actions.includes(action as WorkloadAction)) {
        throw new WorkloadActionNotAllowedError(id, action);
      }

      switch (workload.kind) {
        case "cloudTasksQueue": {
          const queueName = resolveQueueName(workload);
          if (!queueName) throw new Error(`No queue name resolved for ${id}`);
          if (action === "pause") await deps.cloudTasks.pause(queueName);
          else if (action === "resume")
            await deps.cloudTasks.resume(queueName);
          break;
        }
        case "schedulerJob": {
          const jobName = resolveSchedulerJobName(workload);
          if (!jobName) throw new Error(`No job name resolved for ${id}`);
          if (action === "pause") await deps.scheduler.pause(jobName);
          else if (action === "resume") await deps.scheduler.resume(jobName);
          else if (action === "runNow") await deps.scheduler.runNow(jobName);
          break;
        }
        case "pubsubSubscription": {
          const subName = resolveSubscriptionName(workload);
          if (!subName)
            throw new Error(`No subscription name resolved for ${id}`);
          if (action === "pause") await deps.pubsub.pause(subName);
          else if (action === "resume") await deps.pubsub.resume(subName);
          break;
        }
        case "scheduledDataHook": {
          const parts = id
            .slice(SCHEDULED_HOOK_WORKLOAD_ID_PREFIX.length)
            .split(":");
          const tenantId = parts[0]!;
          const hookId = parts.slice(1).join(":");
          if (action === "enable")
            await deps.scheduledHooks.setEnabled(tenantId, hookId, true);
          else if (action === "disable")
            await deps.scheduledHooks.setEnabled(tenantId, hookId, false);
          break;
        }
        default:
          throw new WorkloadActionNotAllowedError(id, action);
      }

      if (deps.audit) {
        await deps.audit
          .write({
            type: "workload.action",
            workloadId: id,
            action,
            actor,
            timestamp: new Date().toISOString(),
          })
          .catch(() => {});
      }
    },

    async listRuns(
      workloadId: string,
      filters?: {
        since?: string;
        until?: string;
        status?: string;
        triggeredBy?: string;
        limit?: number;
        cursor?: string;
      },
    ) {
      return deps.runs.listByWorkloadId(workloadId, {
        since: filters?.since,
        until: filters?.until,
        status: filters?.status as WorkloadRunRecord["status"] | undefined,
        triggeredBy: filters?.triggeredBy as
          | WorkloadRunRecord["triggeredBy"]
          | undefined,
        limit: filters?.limit,
        cursor: filters?.cursor,
      });
    },

    async getRun(workloadId: string, runId: string) {
      const run = await deps.runs.getById(runId);
      if (!run || run.workloadId !== workloadId) return null;
      return run;
    },

    async getRunLogs(
      workloadId: string,
      runId: string,
      options?: { tail?: number },
    ) {
      const run = await deps.runs.getById(runId);
      if (!run || run.workloadId !== workloadId) return null;

      const logEntries = await deps.cloudLogging.listEntries({
        workloadRunId: runId,
        tail: options?.tail,
        since: run.startedAt,
      });

      return {
        run,
        logEntries,
        logExcerpt: run.logExcerpt ?? [],
        cloudLoggingUrl:
          run.cloudLoggingUrl ??
          deps.cloudLogging.buildLogUrl(
            runId,
            run.startedAt,
            run.completedAt,
          ),
      };
    },

    async getRunTrace(rootRunId: string) {
      return deps.runs.listByRootRunId(rootRunId);
    },
  };
}

export class WorkloadNotFoundError extends Error {
  constructor(id: string) {
    super(`Workload not found: ${id}`);
    this.name = "WorkloadNotFoundError";
  }
}

export class WorkloadActionNotAllowedError extends Error {
  constructor(id: string, action: string) {
    super(`Action "${action}" is not allowed on workload "${id}"`);
    this.name = "WorkloadActionNotAllowedError";
  }
}

export type WorkloadController = ReturnType<typeof createWorkloadController>;
