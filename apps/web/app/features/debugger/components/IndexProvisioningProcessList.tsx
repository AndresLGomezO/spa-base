import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Info,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { Button, Card, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import {
  getTenantIndexProvisioningStatus,
  type IndexProvisioningJob,
  type IndexProvisioningJobPhase,
  type IndexProvisioningLogEntry,
  type IndexProvisioningLogLevel,
} from "../../../lib/api-client";
import { DebuggerStatusBadge } from "./DebuggerStatusBadge";

const TENANT_INDEX_PROCESS_LIST_QUERY_KEY =
  "tenant-index-process-list" as const;

type ProcessListFilter = "all" | "creating" | "failed" | "ready";

function pollIntervalForSummary(
  creatingCount: number,
  errorCount: number,
): number | false {
  if (creatingCount > 0) {
    return 5_000;
  }
  if (errorCount > 0) {
    return 15_000;
  }
  return false;
}

function phaseToBadgeStatus(phase: IndexProvisioningJobPhase): string {
  switch (phase) {
    case "creating":
      return "running";
    case "ready":
      return "success";
    case "error":
      return "error";
    default:
      return "info";
  }
}

function shortSignature(signature: string): string {
  return signature.length <= 12 ? signature : `${signature.slice(0, 12)}…`;
}

function LogLevelIcon({
  level,
}: {
  readonly level: IndexProvisioningLogLevel;
}) {
  switch (level) {
    case "success":
      return (
        <CheckCircle2 className="text-success size-3.5 shrink-0" aria-hidden />
      );
    case "error":
      return (
        <AlertTriangle
          className="text-destructive size-3.5 shrink-0"
          aria-hidden
        />
      );
    case "warning":
      return (
        <AlertTriangle className="text-warning size-3.5 shrink-0" aria-hidden />
      );
    default:
      return <Info className="text-info size-3.5 shrink-0" aria-hidden />;
  }
}

function IndexJobLogTimeline({
  entries,
}: {
  readonly entries: readonly IndexProvisioningLogEntry[];
}) {
  const { t } = useTranslation("common");

  if (entries.length === 0) {
    return (
      <Text className="text-muted-foreground text-xs">
        {t("indexProvisioning.processList.noLogEntries")}
      </Text>
    );
  }

  return (
    <ol className="space-y-2 border-l border-dashed pl-3">
      {entries.map((entry, index) => (
        <li
          key={`${entry.timestamp}-${entry.event}-${index}`}
          className="space-y-1"
        >
          <div className="flex items-start gap-2">
            <LogLevelIcon level={entry.level} />
            <div className="min-w-0 flex-1">
              <Text className="text-xs font-medium">{entry.message}</Text>
              <Text className="text-muted-foreground text-[11px]">
                {new Date(entry.timestamp).toLocaleString()}
              </Text>
              {entry.detail ? (
                <Text className="text-destructive mt-1 text-xs whitespace-pre-wrap">
                  {entry.detail}
                </Text>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function IndexJobRow({
  job,
  expanded,
  onToggle,
}: {
  readonly job: IndexProvisioningJob;
  readonly expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation("common");

  return (
    <div className="border-border rounded-md border">
      <button
        type="button"
        className="hover:bg-muted/40 flex w-full items-start gap-2 px-3 py-2 text-left"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Text className="font-medium">{job.collection}</Text>
            <Text className="text-muted-foreground font-mono text-xs">
              {shortSignature(job.signature)}
            </Text>
            <DebuggerStatusBadge
              status={phaseToBadgeStatus(job.phase)}
              size="compact"
            />
            {job.requiresManualAction ? (
              <Text className="text-destructive text-xs">
                {t("indexProvisioning.processList.manualActionRequired")}
              </Text>
            ) : null}
          </div>
          {job.errorMessage && !expanded ? (
            <Text className="text-destructive text-xs">{job.errorMessage}</Text>
          ) : null}
        </div>
        {job.phase === "creating" ? (
          <Loader2 className="text-primary mt-0.5 size-4 shrink-0 animate-spin" />
        ) : job.phase === "ready" ? (
          <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" />
        ) : job.phase === "error" ? (
          <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
        ) : (
          <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        )}
      </button>
      {expanded ? (
        <div className="border-border space-y-2 border-t px-3 py-3">
          {job.errorMessage ? (
            <Text className="text-destructive text-xs whitespace-pre-wrap">
              {job.errorMessage}
            </Text>
          ) : null}
          <IndexJobLogTimeline entries={job.log} />
        </div>
      ) : null}
    </div>
  );
}

function matchesFilter(
  job: IndexProvisioningJob,
  filter: ProcessListFilter,
): boolean {
  switch (filter) {
    case "creating":
      return job.phase === "creating";
    case "failed":
      return job.phase === "error";
    case "ready":
      return job.phase === "ready";
    default:
      return true;
  }
}

export function IndexProvisioningProcessList() {
  const { t } = useTranslation("common");
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter");
  const [filter, setFilter] = useState<ProcessListFilter>(
    initialFilter === "failed"
      ? "failed"
      : initialFilter === "creating"
        ? "creating"
        : initialFilter === "ready"
          ? "ready"
          : "all",
  );
  const [expandedSignatures, setExpandedSignatures] = useState<
    ReadonlySet<string>
  >(new Set());

  const statusQuery = useQuery({
    queryKey: [TENANT_INDEX_PROCESS_LIST_QUERY_KEY],
    queryFn: getTenantIndexProvisioningStatus,
    refetchInterval: (query) =>
      pollIntervalForSummary(
        query.state.data?.creatingCount ?? 0,
        query.state.data?.errorCount ?? 0,
      ),
  });

  const summary = statusQuery.data;

  const filteredIndexes = useMemo(() => {
    const indexes = summary?.indexes ?? [];
    return indexes.filter((job) => matchesFilter(job, filter));
  }, [filter, summary?.indexes]);

  function toggleExpanded(signature: string) {
    setExpandedSignatures((current) => {
      const next = new Set(current);
      if (next.has(signature)) {
        next.delete(signature);
      } else {
        next.add(signature);
      }
      return next;
    });
  }

  const filterOptions: readonly ProcessListFilter[] = [
    "all",
    "creating",
    "failed",
    "ready",
  ];

  return (
    <Card className="space-y-4 p-4">
      <div className="space-y-1">
        <Text className="font-medium">
          {t("indexProvisioning.processList.title")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("indexProvisioning.processList.summary", {
            total: summary?.totalIndexes ?? 0,
            creating: summary?.creatingCount ?? 0,
            failed: summary?.requiresManualActionCount ?? 0,
          })}
        </Text>
        {summary?.totalIndexes ? (
          <Text className="text-muted-foreground text-sm">
            {t("indexProvisioning.processList.progress", {
              ready: summary.readyCount,
              total: summary.totalIndexes,
            })}
          </Text>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={filter === option ? "primary" : "outline"}
            onClick={() => setFilter(option)}
          >
            {t(`indexProvisioning.processList.filters.${option}`)}
          </Button>
        ))}
      </div>

      {statusQuery.isLoading ? (
        <Text className="text-muted-foreground text-sm">{t("loading")}</Text>
      ) : null}

      {statusQuery.isError ? (
        <Text className="text-destructive text-sm">
          {t("indexProvisioning.processList.loadError")}
        </Text>
      ) : null}

      {!statusQuery.isLoading && filteredIndexes.length === 0 ? (
        <Text className="text-muted-foreground text-sm">
          {t("indexProvisioning.processList.empty")}
        </Text>
      ) : (
        <div className={cn("space-y-2")}>
          {filteredIndexes.map((job) => (
            <IndexJobRow
              key={job.signature}
              job={job}
              expanded={expandedSignatures.has(job.signature)}
              onToggle={() => toggleExpanded(job.signature)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
