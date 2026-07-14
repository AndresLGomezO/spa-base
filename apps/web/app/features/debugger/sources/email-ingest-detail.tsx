import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../../auth/AuthContext";
import {
  getDebugEmailIngestJob,
  type DebugEvent,
  type EmailIngestJobRecord,
  type EmailIngestRunMetrics,
  type EmailIngestStepTraceEntry,
} from "../../../lib/api-client";
import { DebuggerJsonBlock } from "../components/DebuggerJsonBlock";
import {
  DebuggerKpiStrip,
  type DebuggerKpiItem,
} from "../components/DebuggerKpiStrip";
import { DebuggerStatusBadge } from "../components/DebuggerStatusBadge";
import { DebuggerTextBlock } from "../components/DebuggerTextBlock";

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function pendingCount(metrics: EmailIngestRunMetrics): number {
  return Math.max(0, metrics.queued - metrics.finished - metrics.processing);
}

function stepStatusToBadge(
  status: EmailIngestStepTraceEntry["status"],
): string {
  switch (status) {
    case "success":
      return "completed";
    case "error":
      return "failed";
    case "skipped":
      return "skipped";
    default:
      return "info";
  }
}

function TraceTimeline({
  trace,
  selectedIndex,
  onSelect,
}: {
  readonly trace: readonly EmailIngestStepTraceEntry[];
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
}) {
  return (
    <ol className="space-y-2">
      {trace.map((entry, index) => (
        <li key={`${entry.stepId}-${entry.timestamp}-${index}`}>
          <button
            type="button"
            className={`hover:bg-muted/40 w-full cursor-pointer rounded-md border px-3 py-2 text-left text-sm ${
              selectedIndex === index
                ? "border-primary bg-primary/5"
                : "border-border"
            }`}
            onClick={() => onSelect(index)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{entry.stepId}</span>
              <DebuggerStatusBadge status={stepStatusToBadge(entry.status)} />
            </div>
            <Text className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              {entry.message}
            </Text>
            <Text className="text-muted-foreground mt-1 text-[11px]">
              {new Date(entry.timestamp).toLocaleString()}
            </Text>
          </button>
        </li>
      ))}
    </ol>
  );
}

function TraceInspector({
  entry,
}: {
  readonly entry: EmailIngestStepTraceEntry | null;
}) {
  const { t } = useTranslation("common");
  if (!entry) {
    return (
      <Text className="text-muted-foreground">
        {t("debugger.emailIngest.selectStep")}
      </Text>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Heading level={3}>{entry.stepId}</Heading>
        <DebuggerStatusBadge status={stepStatusToBadge(entry.status)} />
      </div>
      <DebuggerTextBlock value={entry.message} />
      <Text className="text-muted-foreground text-xs">{entry.timestamp}</Text>
      {entry.meta ? (
        <section className="space-y-2">
          <Heading level={3}>{t("debugger.emailIngest.stepMeta")}</Heading>
          <DebuggerJsonBlock value={entry.meta} />
        </section>
      ) : null}
    </div>
  );
}

export function EmailIngestDebugDetail({
  event,
}: {
  readonly event: DebugEvent;
}) {
  const { t } = useTranslation("common");
  const { tenantId } = useAuth();
  const [selectedTraceIndex, setSelectedTraceIndex] = useState(0);

  const jobQuery = useQuery({
    queryKey: ["debugger-email-ingest-job", tenantId, event.id],
    queryFn: () => getDebugEmailIngestJob(event.id),
    enabled: Boolean(tenantId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" || status === "pending" ? 2000 : false;
    },
  });

  const job: EmailIngestJobRecord | undefined = jobQuery.data ?? undefined;
  const fallbackJob = event.payload as EmailIngestJobRecord | undefined;
  const resolved = job ?? fallbackJob;
  const trace = resolved?.stepTrace ?? [];
  const selectedEntry = trace[selectedTraceIndex] ?? null;
  const metrics = resolved?.runMetrics;
  const kpiItems = useMemo((): DebuggerKpiItem[] => {
    if (!metrics) {
      return [];
    }
    // Build labels with literal keys (no ternary + overloaded `t` call — crashes tsc 5.9).
    return [
      {
        key: "fetched",
        label: t("debugger.emailIngest.metrics.fetched"),
        value: metrics.fetched,
      },
      {
        key: "queued",
        label: t("debugger.emailIngest.metrics.queued"),
        value: metrics.queued,
      },
      {
        key: "pending",
        label: t("debugger.emailIngest.metrics.pending"),
        value: pendingCount(metrics),
      },
      {
        key: "processing",
        label: t("debugger.emailIngest.metrics.processing"),
        value: metrics.processing,
      },
      {
        key: "finished",
        label: t("debugger.emailIngest.metrics.finished"),
        value: metrics.finished,
      },
      {
        key: "processed",
        label: t("debugger.emailIngest.metrics.processed"),
        value: metrics.processed,
      },
      {
        key: "skippedDedup",
        label: t("debugger.emailIngest.metrics.skippedDedup"),
        value: metrics.skippedDedup,
      },
      {
        key: "skippedNoMatch",
        label: t("debugger.emailIngest.metrics.skippedNoMatch"),
        value: metrics.skippedNoMatch,
      },
      {
        key: "skippedIrrelevant",
        label: t("debugger.emailIngest.metrics.skippedIrrelevant"),
        value: metrics.skippedIrrelevant,
      },
      {
        key: "failed",
        label: t("debugger.emailIngest.metrics.failed"),
        value: metrics.failed,
      },
    ];
  }, [metrics, t]);

  const copyTrace = async () => {
    if (!resolved?.stepTrace) return;
    await navigator.clipboard.writeText(formatJson(resolved.stepTrace));
  };

  if (jobQuery.isLoading && !resolved) {
    return <Text className="text-muted-foreground">{t("loading")}</Text>;
  }

  if (!resolved) {
    return event.payload ? <DebuggerJsonBlock value={event.payload} /> : null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <DebuggerStatusBadge status={resolved.status} />
          <Text className="text-muted-foreground text-sm">{resolved.kind}</Text>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs uppercase">
              {t("debugger.emailIngest.fields.jobId")}
            </dt>
            <dd className="font-mono text-xs break-all">{resolved.id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs uppercase">
              {t("debugger.emailIngest.fields.userId")}
            </dt>
            <dd className="font-mono text-xs break-all">{resolved.userId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs uppercase">
              {t("debugger.emailIngest.fields.createdAt")}
            </dt>
            <dd className="text-xs">{resolved.createdAt}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs uppercase">
              {t("debugger.emailIngest.fields.updatedAt")}
            </dt>
            <dd className="text-xs">{resolved.updatedAt}</dd>
          </div>
          {resolved.completedAt ? (
            <div>
              <dt className="text-muted-foreground text-xs uppercase">
                {t("debugger.emailIngest.fields.completedAt")}
              </dt>
              <dd className="text-xs">{resolved.completedAt}</dd>
            </div>
          ) : null}
        </dl>
        {resolved.errorMessage ? (
          <Text className="text-destructive text-sm">
            {resolved.errorMessage}
          </Text>
        ) : null}
      </section>

      {metrics ? (
        <section className="space-y-2">
          <Heading level={3}>{t("debugger.emailIngest.runMetrics")}</Heading>
          <DebuggerKpiStrip items={kpiItems} />
          <Text className="text-muted-foreground text-xs">
            {t("debugger.emailIngest.runMetricsHint")}
          </Text>
        </section>
      ) : null}

      {resolved.windowQuery ? (
        <section className="space-y-2">
          <Heading level={3}>{t("debugger.emailIngest.windowQuery")}</Heading>
          <DebuggerTextBlock value={resolved.windowQuery} />
        </section>
      ) : null}

      {trace.length > 0 ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={copyTrace}>
            {t("debugger.emailIngest.copyTrace")}
          </Button>
        </div>
      ) : null}

      {trace.length === 0 ? (
        <Text className="text-muted-foreground">
          {t("debugger.emailIngest.noTrace")}
        </Text>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <TraceTimeline
            trace={trace}
            selectedIndex={selectedTraceIndex}
            onSelect={setSelectedTraceIndex}
          />
          <TraceInspector entry={selectedEntry} />
        </div>
      )}
    </div>
  );
}
