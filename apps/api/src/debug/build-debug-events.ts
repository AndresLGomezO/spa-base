import type { AiJobRecord } from "@repo/firestore-converters";
import type { DataHookExecutionRecord } from "@repo/hooks";
import type {
  AuditLogRecord,
  HookLogMessageRecord,
  IndexProvisionEventRecord,
  RequestPerfLogRecord,
  DebugEvent,
  DebugEventSource,
} from "@repo/debug-logs";
import { formatHookLogDebugPresentation } from "@repo/debug-logs";
import { formatHookExecutionSubtitle } from "@repo/hooks";

function aiJobStatus(
  status: AiJobRecord["status"],
): DebugEvent["status"] | undefined {
  if (
    status === "running" ||
    status === "pending" ||
    status === "failed" ||
    status === "completed"
  ) {
    return status;
  }
  return undefined;
}

function aiJobTitle(job: AiJobRecord): string {
  if (job.feature === "chat" && "question" in job.input) {
    const question = job.input.question;
    if (typeof question === "string" && question.trim().length > 0) {
      return question.slice(0, 80);
    }
  }
  if (
    (job.feature === "uiBuilder" || job.feature === "gmailExtract") &&
    "entityName" in job.input
  ) {
    const entityName = job.input.entityName;
    if (typeof entityName === "string") {
      return `${entityName} · ${job.status}`;
    }
  }
  if (
    job.feature === "dataHookCallAi" &&
    "kind" in job.input &&
    job.input.kind === "dataHookCallAi"
  ) {
    const hookLabel = job.input.hookName ?? job.input.hookId;
    return `${hookLabel} · callAi`;
  }
  if (
    job.feature === "dataHookBatchCallAi" &&
    "kind" in job.input &&
    job.input.kind === "dataHookBatchCallAi"
  ) {
    return `batch callAi · ${job.input.itemCount} items`;
  }
  if (
    job.feature === "dataHookEmbedding" &&
    "kind" in job.input &&
    job.input.kind === "dataHookEmbedding"
  ) {
    const label = job.input.entityName ?? job.input.hookId ?? "embedding";
    return `${label} · embedding`;
  }
  if (
    job.feature === "uiBuilder" &&
    "kind" in job.input &&
    job.input.kind === "uiBuilderStep"
  ) {
    return `${job.input.stepId} · step`;
  }
  return job.id;
}

function aiJobUsageSummary(job: AiJobRecord): {
  readonly modelId?: string;
  readonly totalTokens?: number;
  readonly estimatedCostUsd?: number;
} {
  const usage = job.modelUsage;
  if (!usage) {
    return {};
  }
  const totalTokens =
    usage.totalTokens ??
    (usage.promptTokens != null || usage.candidatesTokens != null
      ? (usage.promptTokens ?? 0) + (usage.candidatesTokens ?? 0)
      : undefined);
  return {
    modelId: usage.modelId,
    ...(totalTokens != null ? { totalTokens } : {}),
    ...(usage.estimatedCostUsd != null
      ? { estimatedCostUsd: usage.estimatedCostUsd }
      : {}),
  };
}

export function toAiDebugEvent(job: AiJobRecord): DebugEvent {
  return {
    id: job.id,
    source: "ai",
    timestamp: job.updatedAt,
    title: aiJobTitle(job),
    subtitle: job.feature,
    status: aiJobStatus(job.status),
    summary: {
      feature: job.feature,
      status: job.status,
      error: job.error,
      ...aiJobUsageSummary(job),
    },
    payload: {
      id: job.id,
      status: job.status,
      feature: job.feature,
      input: job.input,
      output: job.output,
      error: job.error,
      progress: job.progress,
      ...(job.modelUsage ? { modelUsage: job.modelUsage } : {}),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
  };
}

function toHookExecutionDebugEvent(
  record: DataHookExecutionRecord,
): DebugEvent {
  return {
    id: record.id,
    source: "hookExecution",
    timestamp: record.startedAt,
    title: record.hookName,
    subtitle: formatHookExecutionSubtitle(record),
    status: record.status,
    summary: {
      hookId: record.hookId,
      hookName: record.hookName,
      entityName: record.entityName,
      phase: record.phase,
      operation: record.operation,
      executionMode: record.executionMode,
      durationMs: record.durationMs,
      error: record.error,
      recordId: record.recordId,
      emailLedgerId: record.emailLedgerId,
      chainDepth: record.chainDepth,
      writesCreated: record.writesCreated,
      writesUpdated: record.writesUpdated,
      writesDeleted: record.writesDeleted,
      writesByEntity: record.writesByEntity,
      actionTrace: record.actionTrace,
    },
    payload: record,
  };
}

export function mergeHookExecutionDebugEvents(
  active: readonly DataHookExecutionRecord[],
  recent: readonly DataHookExecutionRecord[],
  limit: number,
): DebugEvent[] {
  const activeIds = new Set(active.map((record) => record.id));
  return [...active, ...recent.filter((record) => !activeIds.has(record.id))]
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    .slice(0, limit)
    .map(toHookExecutionDebugEvent);
}

export function toHookLogDebugEvent(record: HookLogMessageRecord): DebugEvent {
  const presentation = formatHookLogDebugPresentation(record);

  return {
    id: record.id,
    source: "hookLog",
    timestamp: record.timestamp,
    title: presentation.title,
    subtitle: presentation.subtitle,
    status: record.level === "error" ? "error" : "info",
    summary: presentation.summary,
    payload: record,
  };
}

export function toAuditDebugEvent(record: AuditLogRecord): DebugEvent {
  return {
    id: record.id,
    source: "audit",
    timestamp: record.timestamp,
    title: record.action,
    subtitle: `${record.entity} · ${record.recordId}`,
    status: "info",
    summary: {
      actorId: record.actorId,
      targetUserId: record.targetUserId,
      permission: record.permission,
    },
    payload: record,
  };
}

export function toRequestPerfDebugEvent(
  record: RequestPerfLogRecord,
): DebugEvent {
  return {
    id: record.id,
    source: "requestPerf",
    timestamp: record.timestamp,
    title: `${record.method} ${record.route}`,
    subtitle: `${record.statusCode} · ${record.totalMs}ms`,
    status: record.statusCode >= 500 ? "error" : "success",
    summary: {
      rbacMs: record.rbacMs,
      queryMs: record.queryMs,
      hooksMs: record.hooksMs,
      totalMs: record.totalMs,
      statusCode: record.statusCode,
    },
    payload: record,
  };
}

function indexProvisionEventStatus(
  event: IndexProvisionEventRecord["event"],
): DebugEvent["status"] | undefined {
  if (event === "creating" || event === "ensure_requested") {
    return "running";
  }
  if (event === "ready") {
    return "success";
  }
  if (event === "error" || event === "operation_blocked") {
    return "error";
  }
  return "info";
}

export function toIndexProvisionDebugEvent(
  record: IndexProvisionEventRecord,
): DebugEvent {
  return {
    id: record.id,
    source: "indexProvision",
    timestamp: record.timestamp,
    title: `${record.collection} · ${record.event}`,
    subtitle: record.blockedOperation ?? record.trigger,
    status: indexProvisionEventStatus(record.event),
    summary: {
      event: record.event,
      collection: record.collection,
      signature: record.signature,
      status: record.status,
      blockedOperation: record.blockedOperation,
      errorMessage: record.errorMessage,
    },
    payload: record,
  };
}

export function toEmailIngestDebugEvent(record: {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly kind: string;
  readonly updatedAt: string;
  readonly createdAt: string;
  readonly errorMessage?: string | null;
  readonly stepTrace?: readonly unknown[];
  readonly userId?: string;
  readonly runMetrics?: {
    readonly fetched?: number;
    readonly queued?: number;
    readonly processing?: number;
    readonly finished?: number;
    readonly processed?: number;
    readonly skippedDedup?: number;
    readonly skippedNoMatch?: number;
    readonly skippedIrrelevant?: number;
    readonly failed?: number;
  } | null;
  readonly windowQuery?: string | null;
}): DebugEvent {
  const status =
    record.status === "completed"
      ? "completed"
      : record.status === "failed"
        ? "failed"
        : record.status === "running"
          ? "running"
          : "pending";
  const metrics = record.runMetrics ?? {};
  const fetched = metrics.fetched ?? 0;
  const queued = metrics.queued ?? 0;
  const finished = metrics.finished ?? 0;
  const processing = metrics.processing ?? 0;
  const pending = Math.max(0, queued - finished - processing);
  const failed = metrics.failed ?? 0;
  const subtitleParts = [record.kind];
  if (queued > 0 || fetched > 0) {
    subtitleParts.push(`${finished}/${queued || fetched} done`);
  }
  if (pending > 0) subtitleParts.push(`${pending} queued`);
  if (processing > 0) subtitleParts.push(`${processing} active`);
  if (failed > 0) subtitleParts.push(`${failed} failed`);

  return {
    id: record.id,
    source: "emailIngest",
    timestamp: record.updatedAt || record.createdAt,
    title: record.title,
    subtitle: subtitleParts.join(" · "),
    status,
    summary: {
      kind: record.kind,
      status: record.status,
      userId: record.userId,
      errorMessage: record.errorMessage,
      stepCount: record.stepTrace?.length ?? 0,
      fetched,
      queued,
      processing,
      finished,
      pending,
      processed: metrics.processed ?? 0,
      skippedDedup: metrics.skippedDedup ?? 0,
      skippedNoMatch: metrics.skippedNoMatch ?? 0,
      skippedIrrelevant: metrics.skippedIrrelevant ?? 0,
      failed,
      windowQuery: record.windowQuery ?? null,
    },
    payload: record,
  };
}

export function mergeDebugEvents(
  groups: readonly (readonly DebugEvent[])[],
  limit: number,
): DebugEvent[] {
  return groups
    .flat()
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, limit);
}

export function parseDebugSources(
  raw: string | undefined,
): readonly DebugEventSource[] {
  if (!raw?.trim()) {
    return [
      "ai",
      "hookExecution",
      "hookLog",
      "audit",
      "requestPerf",
      "indexProvision",
      "emailIngest",
    ];
  }

  const allowed = new Set<DebugEventSource>([
    "ai",
    "hookExecution",
    "hookLog",
    "audit",
    "requestPerf",
    "indexProvision",
    "emailIngest",
  ]);
  const aliases: Record<string, DebugEventSource> = {
    ai: "ai",
    hooks: "hookExecution",
    hookExecution: "hookExecution",
    hookLogs: "hookLog",
    hookLog: "hookLog",
    audit: "audit",
    perf: "requestPerf",
    requestPerf: "requestPerf",
    indexProvision: "indexProvision",
    indexProvisioning: "indexProvision",
    emailIngest: "emailIngest",
    email: "emailIngest",
  };

  const parsed = raw
    .split(",")
    .map((entry) => entry.trim())
    .map((entry) => aliases[entry])
    .filter((entry): entry is DebugEventSource =>
      Boolean(entry && allowed.has(entry)),
    );

  return parsed.length > 0
    ? [...new Set(parsed)]
    : [
        "ai",
        "hookExecution",
        "hookLog",
        "audit",
        "requestPerf",
        "indexProvision",
        "emailIngest",
      ];
}
