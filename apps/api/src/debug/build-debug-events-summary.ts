import type {
  AiJobRepository,
  AuditLogRepository,
  DataHookExecutionRepository,
  HookLogMessageRepository,
  IndexProvisionEventRepository,
  RequestPerfLogRepository,
} from "@repo/firestore-converters";
import type { EmailIngestJobRepository } from "@repo/gcp-firebase";
import type { DebugEvent, DebugEventSource } from "@repo/debug-logs";
import { resolveEntityCollection } from "@repo/firestore-indexes";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import {
  mergeHookExecutionDebugEvents,
  toAiDebugEvent,
  toAuditDebugEvent,
  toEmailIngestDebugEvent,
  toHookLogDebugEvent,
  toIndexProvisionDebugEvent,
  toRequestPerfDebugEvent,
} from "./build-debug-events.js";
import { computeDebuggerSourceStats } from "./compute-debugger-source-stats.js";

const SUMMARY_PAGE_SIZE = 200;
const DEBUG_EVENTS_SUMMARY_SCAN_CAP = 5000;

interface CollectSummaryDeps {
  readonly aiJobRepository: AiJobRepository;
  readonly hookExecutionRepository: DataHookExecutionRepository;
  readonly hookLogMessageRepository: HookLogMessageRepository;
  readonly auditLogRepository: AuditLogRepository;
  readonly requestPerfLogRepository: RequestPerfLogRepository;
  readonly indexProvisionEventRepository: IndexProvisionEventRepository;
  readonly emailIngestJobRepository?: EmailIngestJobRepository;
  readonly entityRuntime: EntityRuntimeContext;
}

async function collectPagedRecent(
  fetchPage: (limit: number) => Promise<readonly DebugEvent[]>,
  cap: number,
): Promise<{ readonly events: DebugEvent[]; readonly truncated: boolean }> {
  const events: DebugEvent[] = [];
  let truncated = false;
  // Single fetch at cap for repos without cursor; for hooks we page below.
  const page = await fetchPage(Math.min(cap, SUMMARY_PAGE_SIZE * 5));
  events.push(...page);
  if (page.length >= cap) {
    truncated = true;
  }
  return { events: events.slice(0, cap), truncated };
}

export async function collectDebugEventsForSummary(
  deps: CollectSummaryDeps,
  tenantId: string,
  source: DebugEventSource,
  since: string,
  until: string,
  permissions: {
    readonly canReadAi: boolean;
    readonly canReadHooks: boolean;
    readonly canReadSensitive: boolean;
  },
): Promise<{
  readonly events: readonly DebugEvent[];
  readonly truncated: boolean;
  readonly scannedCount: number;
}> {
  const timeRange = { since, until };
  const cap = DEBUG_EVENTS_SUMMARY_SCAN_CAP;

  if (source === "ai" && permissions.canReadAi) {
    const result = await collectPagedRecent(
      async (limit) =>
        (
          await deps.aiJobRepository.listRecent(tenantId, {
            limit,
            ...timeRange,
          })
        ).map(toAiDebugEvent),
      cap,
    );
    return {
      events: result.events,
      truncated: result.truncated,
      scannedCount: result.events.length,
    };
  }

  if (source === "hookExecution" && permissions.canReadHooks) {
    const events: DebugEvent[] = [];
    let cursor = null as
      | Awaited<
          ReturnType<DataHookExecutionRepository["listRecent"]>
        >["nextCursor"]
      | null;
    let truncated = false;
    const [active] = await Promise.all([
      deps.hookExecutionRepository.listActive(tenantId),
    ]);

    while (events.length < cap) {
      const page = await deps.hookExecutionRepository.listRecent(tenantId, {
        limit: SUMMARY_PAGE_SIZE,
        cursor,
        ...timeRange,
      });
      const mapped = mergeHookExecutionDebugEvents(
        cursor ? [] : active,
        page.items,
        SUMMARY_PAGE_SIZE + active.length,
      ).filter((event) => {
        const ts = Date.parse(event.timestamp);
        return (
          Number.isFinite(ts) &&
          ts >= Date.parse(since) &&
          ts <= Date.parse(until)
        );
      });
      for (const event of mapped) {
        if (events.some((existing) => existing.id === event.id)) {
          continue;
        }
        events.push(event);
        if (events.length >= cap) {
          truncated = true;
          break;
        }
      }
      if (!page.nextCursor || page.items.length === 0) {
        break;
      }
      cursor = page.nextCursor;
      if (page.items.length < SUMMARY_PAGE_SIZE) {
        break;
      }
    }
    return {
      events: events.slice(0, cap),
      truncated,
      scannedCount: Math.min(events.length, cap),
    };
  }

  if (source === "hookLog" && permissions.canReadHooks) {
    const result = await collectPagedRecent(
      async (limit) =>
        (
          await deps.hookLogMessageRepository.listRecent(tenantId, {
            limit,
            ...timeRange,
          })
        ).map(toHookLogDebugEvent),
      cap,
    );
    return {
      events: result.events,
      truncated: result.truncated,
      scannedCount: result.events.length,
    };
  }

  if (source === "audit" && permissions.canReadSensitive) {
    const result = await collectPagedRecent(
      async (limit) =>
        (
          await deps.auditLogRepository.listRecent(tenantId, {
            limit,
            ...timeRange,
          })
        ).map(toAuditDebugEvent),
      cap,
    );
    return {
      events: result.events,
      truncated: result.truncated,
      scannedCount: result.events.length,
    };
  }

  if (source === "requestPerf" && permissions.canReadSensitive) {
    const result = await collectPagedRecent(
      async (limit) =>
        (
          await deps.requestPerfLogRepository.listRecent(tenantId, {
            limit,
            ...timeRange,
          })
        ).map(toRequestPerfDebugEvent),
      cap,
    );
    return {
      events: result.events,
      truncated: result.truncated,
      scannedCount: result.events.length,
    };
  }

  if (source === "indexProvision" && permissions.canReadSensitive) {
    const tenantCollections = [
      ...new Set(
        deps.entityRuntime
          .getEntitiesForTenant(tenantId)
          .map((entity) => resolveEntityCollection(entity)),
      ),
    ];
    const result = await collectPagedRecent(
      async (limit) =>
        (
          await deps.indexProvisionEventRepository.listRecentForTenant(
            tenantId,
            tenantCollections,
            { limit, ...timeRange },
          )
        ).map(toIndexProvisionDebugEvent),
      cap,
    );
    return {
      events: result.events,
      truncated: result.truncated,
      scannedCount: result.events.length,
    };
  }

  if (source === "emailIngest" && deps.emailIngestJobRepository) {
    const result = await collectPagedRecent(
      async (limit) =>
        (
          await deps.emailIngestJobRepository!.listRecent(tenantId, {
            limit,
            ...timeRange,
          })
        ).map(toEmailIngestDebugEvent),
      cap,
    );
    return {
      events: result.events,
      truncated: result.truncated,
      scannedCount: result.events.length,
    };
  }

  return { events: [], truncated: false, scannedCount: 0 };
}

export function buildDebugEventsSummaryPayload(
  source: DebugEventSource,
  events: readonly DebugEvent[],
  scannedCount: number,
  truncated: boolean,
  hookExecutionLive?: {
    readonly pending: number;
    readonly running: number;
    readonly queuedPending: number;
    readonly inlineRunning: number;
    readonly deferredRunning: number;
    readonly cloudRunning: number;
  },
) {
  const stats = computeDebuggerSourceStats(events, source);
  return {
    source,
    total: stats.total,
    scannedCount,
    truncated,
    statusCounts: stats.statusCounts,
    errorRate: stats.errorRate,
    inProgressCount: stats.inProgressCount,
    avgDurationMs: stats.avgDurationMs,
    totalWrites: stats.totalWrites,
    writesCreated: stats.writesCreated,
    writesUpdated: stats.writesUpdated,
    writesDeleted: stats.writesDeleted,
    writeExecutionCount: stats.writeExecutionCount,
    avgTotalMs: stats.avgTotalMs,
    avgHooksMs: stats.avgHooksMs,
    avgQueryMs: stats.avgQueryMs,
    uniqueActors: stats.uniqueActors,
    emailIngestFetched: stats.emailIngestFetched,
    emailIngestQueued: stats.emailIngestQueued,
    emailIngestProcessing: stats.emailIngestProcessing,
    emailIngestFinished: stats.emailIngestFinished,
    emailIngestProcessed: stats.emailIngestProcessed,
    emailIngestFailedMessages: stats.emailIngestFailedMessages,
    barCharts: stats.barCharts,
    timelineBuckets: stats.timelineBuckets,
    attentionItems: stats.attentionItems.map((event) => ({
      id: event.id,
      source: event.source,
      title: event.title,
      timestamp: event.timestamp,
      ...(event.status ? { status: event.status } : {}),
      ...(event.subtitle ? { subtitle: event.subtitle } : {}),
    })),
    ...(hookExecutionLive ? { hookExecutionLive } : {}),
  };
}
