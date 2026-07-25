import type { DebugEventsSummary } from "../../lib/api-client";
import type {
  DebuggerBarChartStats,
  DebuggerSourceStats,
} from "./compute-debugger-source-stats";

export function mapWindowSummaryToSourceStats(
  summary: DebugEventsSummary,
): DebuggerSourceStats {
  return {
    total: summary.total,
    statusCounts: summary.statusCounts,
    errorRate: summary.errorRate,
    avgDurationMs: summary.avgDurationMs,
    totalWrites: summary.totalWrites,
    writesCreated: summary.writesCreated,
    writesUpdated: summary.writesUpdated,
    writesDeleted: summary.writesDeleted,
    writeExecutionCount: summary.writeExecutionCount,
    avgTotalMs: summary.avgTotalMs,
    avgHooksMs: summary.avgHooksMs,
    avgQueryMs: summary.avgQueryMs,
    inProgressCount: summary.inProgressCount,
    uniqueActors: summary.uniqueActors,
    emailIngestFetched: summary.emailIngestFetched,
    emailIngestQueued: summary.emailIngestQueued,
    emailIngestProcessing: summary.emailIngestProcessing,
    emailIngestFinished: summary.emailIngestFinished,
    emailIngestProcessed: summary.emailIngestProcessed,
    emailIngestFailedMessages: summary.emailIngestFailedMessages,
    totalTokens: summary.totalTokens ?? null,
    estimatedCostUsd: summary.estimatedCostUsd ?? null,
    barCharts: summary.barCharts as DebuggerBarChartStats[],
    timelineBuckets: summary.timelineBuckets,
    attentionItems: summary.attentionItems.map((item) => ({
      id: item.id,
      source: item.source,
      title: item.title,
      timestamp: item.timestamp,
      ...(item.status ? { status: item.status } : {}),
      ...(item.subtitle ? { subtitle: item.subtitle } : {}),
    })),
  };
}
