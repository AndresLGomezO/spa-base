import {
  getWorkloadById,
  listWorkloads as listRegistryWorkloads,
  SCHEDULED_HOOK_WORKLOAD_ID_PREFIX,
  type WorkloadAction,
  type WorkloadRecord,
  type WorkloadStateSnapshot,
  type WorkloadWithState,
} from "@repo/workload-registry";
import type {
  WorkloadRunRepository,
  WorkloadRunRecord,
} from "@repo/workload-runs";

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
  /** Effective Gmail ingest delivery mode (env + Platform Observability override). */
  readonly getGmailIngestDeliveryMode: () => Promise<"poll" | "push">;
  readonly audit?: {
    write: (event: Record<string, unknown>) => Promise<void>;
  };
}

const GMAIL_POLL_WORKLOAD_ID = "scheduler:gmail-poll";
const GMAIL_PUSH_WORKLOAD_ID = "pubsub:gmail-push-api";

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

  async function applyGmailDeliveryModeGate(
    workload: WorkloadRecord,
    snapshot: WorkloadStateSnapshot,
  ): Promise<WorkloadStateSnapshot> {
    if (
      workload.id !== GMAIL_POLL_WORKLOAD_ID &&
      workload.id !== GMAIL_PUSH_WORKLOAD_ID
    ) {
      return snapshot;
    }

    const deliveryMode = await deps.getGmailIngestDeliveryMode();
    const productActive =
      (workload.id === GMAIL_POLL_WORKLOAD_ID && deliveryMode === "poll") ||
      (workload.id === GMAIL_PUSH_WORKLOAD_ID && deliveryMode === "push");

    if (productActive) {
      return {
        ...snapshot,
        live: {
          ...snapshot.live,
          deliveryMode,
          productActive: true,
        },
      };
    }

    // Inactive path no-ops at runtime even if the GCP resource still exists.
    return {
      status: "disabled",
      live: {
        ...snapshot.live,
        deliveryMode,
        productActive: false,
        gcpStatus: snapshot.status,
      },
      fetchedAt: snapshot.fetchedAt,
      ...(snapshot.error ? { error: snapshot.error } : {}),
    };
  }

  function relatedWorkloadIds(workloadId: string): string[] {
    const ids = new Set<string>([workloadId]);
    for (const child of listRegistryWorkloads()) {
      if (child.controlledBy?.includes(workloadId)) {
        ids.add(child.id);
      }
    }
    return [...ids];
  }

  async function hasActiveRun(workloadId: string): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    // Handler routes record runs under catalog IDs (worker:*, inprocess:*).
    // Roll those into the ops parent listed in controlledBy so queues/schedulers
    // show Running while ingestion (etc.) is in flight.
    let total = 0;
    for (const id of relatedWorkloadIds(workloadId)) {
      try {
        const counts = await deps.runs.countByWorkloadIdSince(id, since);
        total += counts.running;
      } catch {
        // ignore per-id failures
      }
    }
    return total;
  }

  async function fetchState(
    workload: WorkloadRecord,
  ): Promise<WorkloadStateSnapshot> {
    const now = new Date().toISOString();

    try {
      let snapshot: WorkloadStateSnapshot;
      switch (workload.kind) {
        case "cloudTasksQueue": {
          const queueName = resolveQueueName(workload);
          if (!queueName)
            return { status: "unknown", live: {}, fetchedAt: now };
          const state = await deps.cloudTasks.getState(queueName);
          snapshot = { ...state, fetchedAt: now };
          break;
        }
        case "schedulerJob": {
          const jobName = resolveSchedulerJobName(workload);
          if (!jobName) return { status: "unknown", live: {}, fetchedAt: now };
          const state = await deps.scheduler.getState(jobName);
          snapshot = { ...state, fetchedAt: now };
          break;
        }
        case "pubsubSubscription": {
          const subName = resolveSubscriptionName(workload);
          if (!subName) return { status: "unknown", live: {}, fetchedAt: now };
          const state = await deps.pubsub.getState(subName);
          snapshot = { ...state, fetchedAt: now };
          break;
        }
        case "scheduledDataHook": {
          // Enabled cron hooks are armed ("scheduled"), not executing.
          const armed =
            workload.enabled === true ||
            (workload.enabled == null && workload.actions.includes("disable"));
          snapshot = {
            status: armed ? "scheduled" : "disabled",
            live: {
              enabled: armed,
              ...(workload.schedule?.cron
                ? { cron: workload.schedule.cron }
                : {}),
            },
            fetchedAt: now,
          };
          break;
        }
        case "workerRoute":
          // Docs/catalog only — not an independently running job.
          return {
            status: "unknown",
            live: { route: workload.route },
            fetchedAt: now,
          };
        case "inProcessScheduler":
          // Docs/catalog only — not an independently running job.
          return {
            status: "unknown",
            live: { sourceFile: workload.sourceFile },
            fetchedAt: now,
          };
        default:
          return { status: "unknown", live: {}, fetchedAt: now };
      }

      snapshot = await applyGmailDeliveryModeGate(workload, snapshot);

      // Promote armed/ready workloads to "running" only when work is in flight.
      // Skip product-disabled / paused paths.
      if (snapshot.status === "scheduled" || snapshot.status === "ready") {
        const activeRuns = await hasActiveRun(workload.id);
        let pendingDepth = 0;
        if (workload.kind === "cloudTasksQueue" && activeRuns === 0) {
          const queueName = resolveQueueName(workload);
          if (queueName) {
            try {
              const pending = await deps.cloudTasks.listPendingTasks(
                queueName,
                1,
              );
              pendingDepth = pending.length;
            } catch {
              pendingDepth = 0;
            }
          }
        }
        if (activeRuns > 0 || pendingDepth > 0) {
          return {
            ...snapshot,
            status: "running",
            live: {
              ...snapshot.live,
              ...(activeRuns > 0 ? { activeRuns } : {}),
              ...(pendingDepth > 0 ? { depth: pendingDepth } : {}),
            },
            fetchedAt: now,
          };
        }
      }

      return snapshot;
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
      status?: string[];
      q?: string;
    }): Promise<WorkloadWithState[]> {
      const registryWorkloads = listRegistryWorkloads({
        kind: filters?.kind,
        source: filters?.source,
        q: filters?.q,
      }) as WorkloadRecord[];

      // Scheduled hooks are always source:"hook". Skip them when a source
      // filter is set and does not include "hook" (ownership is exclusive).
      let hookWorkloads: WorkloadRecord[] = [];
      const sourceFilter = filters?.source ?? [];
      const includeHooksBySource =
        sourceFilter.length === 0 || sourceFilter.includes("hook");
      const includeHooksByKind =
        !filters?.kind ||
        filters.kind.length === 0 ||
        filters.kind.includes("scheduledDataHook");
      if (includeHooksBySource && includeHooksByKind) {
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

      if (filters?.status && filters.status.length > 0) {
        const statusSet = new Set(filters.status);
        workloads = workloads.filter((w) => statusSet.has(w.state.status));
      }

      return workloads;
    },

    async getWorkload(
      id: string,
    ): Promise<
      (WorkloadWithState & { runStats?: Record<string, number> }) | null
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
        const empty = {
          success: 0,
          error: 0,
          timeout: 0,
          running: 0,
          cancelled: 0,
        };
        const totals = { ...empty };
        for (const relatedId of relatedWorkloadIds(id)) {
          const counts = await deps.runs.countByWorkloadIdSince(
            relatedId,
            since,
          );
          totals.success += counts.success;
          totals.error += counts.error;
          totals.timeout += counts.timeout;
          totals.running += counts.running;
          totals.cancelled += counts.cancelled;
        }
        runStats = totals;
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
          else if (action === "resume") await deps.cloudTasks.resume(queueName);
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
      const relatedIds = relatedWorkloadIds(workloadId);
      const listOptions = {
        since: filters?.since,
        until: filters?.until,
        status: filters?.status as WorkloadRunRecord["status"] | undefined,
        triggeredBy: filters?.triggeredBy as
          | WorkloadRunRecord["triggeredBy"]
          | undefined,
        limit: filters?.limit,
        cursor: filters?.cursor,
      };

      // Single id: preserve native pagination.
      if (relatedIds.length === 1) {
        return deps.runs.listByWorkloadId(relatedIds[0]!, listOptions);
      }

      // Parent + catalog handlers: merge first pages (cursor ignored across ids).
      const limit = filters?.limit ?? 50;
      const pages = await Promise.all(
        relatedIds.map((id) =>
          deps.runs.listByWorkloadId(id, {
            ...listOptions,
            limit,
            cursor: undefined,
          }),
        ),
      );
      const merged = pages
        .flatMap((page) => page.items)
        .slice()
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      return {
        items: merged.slice(0, limit),
        nextCursor: null,
      };
    },

    async getRun(workloadId: string, runId: string) {
      const run = await deps.runs.getById(runId);
      if (!run) return null;
      const allowed = new Set(relatedWorkloadIds(workloadId));
      if (!allowed.has(run.workloadId)) return null;
      return run;
    },

    async getRunLogs(
      workloadId: string,
      runId: string,
      options?: { tail?: number },
    ) {
      const run = await deps.runs.getById(runId);
      if (!run) return null;
      const allowed = new Set(relatedWorkloadIds(workloadId));
      if (!allowed.has(run.workloadId)) return null;

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
          deps.cloudLogging.buildLogUrl(runId, run.startedAt, run.completedAt),
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
