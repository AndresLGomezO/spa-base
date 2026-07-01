import type { AiJobRecord } from "@repo/firestore-converters";
import type { DataHookExecutionRecord } from "@repo/hooks";
import type {
  AuditLogRecord,
  HookLogMessageRecord,
  RequestPerfLogRecord,
  DebugEvent,
  DebugEventSource,
} from "@repo/debug-logs";

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
  if (job.feature === "uiBuilder" && "entityName" in job.input) {
    const entityName = job.input.entityName;
    if (typeof entityName === "string") {
      return `${entityName} · ${job.status}`;
    }
  }
  return job.id;
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
    },
    payload: {
      id: job.id,
      status: job.status,
      feature: job.feature,
      input: job.input,
      output: job.output,
      error: job.error,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
  };
}

export function toHookExecutionDebugEvent(
  record: DataHookExecutionRecord,
): DebugEvent {
  return {
    id: record.id,
    source: "hookExecution",
    timestamp: record.startedAt,
    title: record.hookName,
    subtitle: `${record.entityName} · ${record.event}`,
    status: record.status,
    summary: {
      hookId: record.hookId,
      entityName: record.entityName,
      phase: record.phase,
      operation: record.operation,
      durationMs: record.durationMs,
      error: record.error,
    },
    payload: record,
  };
}

export function toHookLogDebugEvent(record: HookLogMessageRecord): DebugEvent {
  return {
    id: record.id,
    source: "hookLog",
    timestamp: record.timestamp,
    title: record.message,
    subtitle: record.hookId ?? record.entityName,
    status: record.level === "error" ? "error" : "info",
    summary: {
      level: record.level,
      hookId: record.hookId,
      entityName: record.entityName,
    },
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
    return ["ai", "hookExecution", "hookLog", "audit", "requestPerf"];
  }

  const allowed = new Set<DebugEventSource>([
    "ai",
    "hookExecution",
    "hookLog",
    "audit",
    "requestPerf",
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
    : ["ai", "hookExecution", "hookLog", "audit", "requestPerf"];
}
