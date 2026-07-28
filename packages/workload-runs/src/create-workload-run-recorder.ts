import type { WorkloadRunRef } from "@repo/workload-registry";

import type {
  CreateWorkloadRunInput,
  UpdateWorkloadRunPatch,
  WorkloadRunError,
  WorkloadRunRecord,
  WorkloadRunStatus,
  WorkloadRunTrigger,
  WorkloadRunTriggerContext,
} from "./workload-run.js";

export interface WorkloadRunRepository {
  getById(id: string): Promise<WorkloadRunRecord | null>;
  upsert(input: CreateWorkloadRunInput): Promise<WorkloadRunRecord>;
  update(id: string, patch: UpdateWorkloadRunPatch): Promise<WorkloadRunRecord>;
  listByWorkloadId(
    workloadId: string,
    options?: {
      readonly since?: string;
      readonly until?: string;
      readonly status?: WorkloadRunStatus;
      readonly triggeredBy?: WorkloadRunTrigger;
      readonly limit?: number;
      readonly cursor?: string;
    },
  ): Promise<{
    readonly items: readonly WorkloadRunRecord[];
    readonly nextCursor: string | null;
  }>;
  listByRootRunId(rootRunId: string): Promise<readonly WorkloadRunRecord[]>;
  countByWorkloadIdSince(
    workloadId: string,
    since: string,
  ): Promise<{
    readonly success: number;
    readonly error: number;
    readonly timeout: number;
    readonly running: number;
    readonly cancelled: number;
  }>;
}

export interface BeginWorkloadRunInput {
  readonly workloadId: string;
  readonly triggeredBy: WorkloadRunTrigger;
  readonly triggerContext?: WorkloadRunTriggerContext;
  readonly tenantId?: string;
  readonly parentRunId?: string;
  readonly rootRunId?: string;
  /** Deterministic id. If omitted, a random id is generated. */
  readonly id?: string;
  readonly cloudLoggingUrl?: string;
  readonly metrics?: Record<string, unknown>;
}

export interface WorkloadRunHandle {
  readonly id: string;
  readonly rootRunId: string;
  readonly parentRunId?: string;
  addArtifact(ref: WorkloadRunRef): Promise<void>;
  patchMetrics(partial: Record<string, unknown>): Promise<void>;
  succeed(extra?: {
    readonly metrics?: Record<string, unknown>;
    readonly logExcerpt?: readonly string[];
  }): Promise<void>;
  fail(
    error: WorkloadRunError | string,
    extra?: {
      readonly metrics?: Record<string, unknown>;
      readonly logExcerpt?: readonly string[];
      readonly status?: "error" | "timeout" | "cancelled";
    },
  ): Promise<void>;
  cancel(reason: string): Promise<void>;
}

export interface WorkloadRunRecorder {
  beginRun(input: BeginWorkloadRunInput): Promise<WorkloadRunHandle>;
}

export interface WorkloadRunRecorderDeps {
  readonly repository: WorkloadRunRepository;
  readonly now?: () => Date;
  readonly generateId?: () => string;
}

function randomId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildDeterministicSchedulerRunId(
  jobName: string,
  cronFireTime: Date | string,
): string {
  const iso =
    typeof cronFireTime === "string"
      ? cronFireTime
      : cronFireTime.toISOString();
  return `${jobName}:${iso}`.replace(/[^A-Za-z0-9:_-]/g, "_");
}

export function buildDeterministicCloudTaskRunId(
  queueName: string,
  taskName: string,
  retryCount: number,
): string {
  const shortTask = taskName.split("/").pop() ?? taskName;
  return `${queueName}:${shortTask}:${retryCount}`.replace(
    /[^A-Za-z0-9:_-]/g,
    "_",
  );
}

export function buildDeterministicPubsubRunId(
  subscription: string,
  messageId: string,
  deliveryAttempt: number,
): string {
  return `${subscription}:${messageId}:${deliveryAttempt}`.replace(
    /[^A-Za-z0-9:_-]/g,
    "_",
  );
}

export function createWorkloadRunRecorder(
  deps: WorkloadRunRecorderDeps,
): WorkloadRunRecorder {
  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? randomId;

  return {
    async beginRun(input) {
      const startedAt = now().toISOString();
      const id = input.id ?? generateId();
      const rootRunId = input.rootRunId ?? input.parentRunId ?? id;

      const record = await deps.repository.upsert({
        id,
        workloadId: input.workloadId,
        tenantId: input.tenantId,
        triggeredBy: input.triggeredBy,
        triggerContext: input.triggerContext ?? {},
        startedAt,
        status: "running",
        parentRunId: input.parentRunId,
        rootRunId,
        metrics: input.metrics ?? {},
        artifactRefs: [],
        cloudLoggingUrl: input.cloudLoggingUrl,
      });

      let artifactRefs = [...(record.artifactRefs ?? [])];
      let metrics = { ...(record.metrics ?? {}) };
      let finalized = record.status !== "running";

      const handle: WorkloadRunHandle = {
        id,
        rootRunId,
        parentRunId: input.parentRunId,
        async addArtifact(ref) {
          if (finalized) return;
          artifactRefs = [...artifactRefs, ref];
          await deps.repository.update(id, { artifactRefs });
        },
        async patchMetrics(partial) {
          if (finalized) return;
          metrics = { ...metrics, ...partial };
          await deps.repository.update(id, { metrics });
        },
        async succeed(extra) {
          if (finalized) return;
          finalized = true;
          const completedAt = now().toISOString();
          const durationMs = Math.max(
            0,
            new Date(completedAt).getTime() - new Date(startedAt).getTime(),
          );
          if (extra?.metrics) {
            metrics = { ...metrics, ...extra.metrics };
          }
          await deps.repository.update(id, {
            status: "success",
            completedAt,
            durationMs,
            metrics,
            logExcerpt: extra?.logExcerpt
              ? [...extra.logExcerpt]
              : undefined,
          });
        },
        async fail(error, extra) {
          if (finalized) return;
          finalized = true;
          const completedAt = now().toISOString();
          const durationMs = Math.max(
            0,
            new Date(completedAt).getTime() - new Date(startedAt).getTime(),
          );
          if (extra?.metrics) {
            metrics = { ...metrics, ...extra.metrics };
          }
          const err: WorkloadRunError =
            typeof error === "string" ? { message: error } : error;
          await deps.repository.update(id, {
            status: extra?.status ?? "error",
            completedAt,
            durationMs,
            error: err,
            metrics,
            logExcerpt: extra?.logExcerpt
              ? [...extra.logExcerpt]
              : undefined,
          });
        },
        async cancel(reason) {
          await handle.fail(
            { message: reason, retryable: false },
            { status: "cancelled" },
          );
        },
      };

      return handle;
    },
  };
}
