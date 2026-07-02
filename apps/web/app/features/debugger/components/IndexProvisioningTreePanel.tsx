import { AlertTriangle, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import type { IndexProvisioningJob } from "../../../lib/api-client";
import { useIndexProvisioningJobs } from "../hooks/useIndexProvisioningJobs";
import { useDebugger } from "../debugger-context";
import {
  DEBUGGER_LIST_ROW_HOVER_CLASS,
  DEBUGGER_LIST_ROW_SELECTED_CLASS,
} from "../debugger-status-styles";
import { DebuggerStatusBadge } from "./DebuggerStatusBadge";
import {
  phaseToIndexProvisioningBadgeStatus,
  shortIndexSignature,
} from "./index-provisioning-ui";

function IndexJobTreeRow({
  job,
  isSelected,
  onSelect,
}: {
  readonly job: IndexProvisioningJob;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}) {
  const { t } = useTranslation("common");

  return (
    <button
      type="button"
      role="treeitem"
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-left transition-colors duration-150",
        isSelected
          ? DEBUGGER_LIST_ROW_SELECTED_CLASS
          : DEBUGGER_LIST_ROW_HOVER_CLASS,
      )}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Text className="min-w-0 break-words text-sm font-medium">
            {job.collection}
          </Text>
          <DebuggerStatusBadge
            status={phaseToIndexProvisioningBadgeStatus(job.phase)}
            size="compact"
          />
        </div>
        <Text className="text-muted-foreground break-words font-mono text-xs">
          {shortIndexSignature(job.signature)}
        </Text>
        {job.errorMessage ? (
          <Text className="text-destructive line-clamp-2 text-xs">
            {job.errorMessage}
          </Text>
        ) : null}
        {job.requiresManualAction ? (
          <Text className="text-destructive text-xs">
            {t("indexProvisioning.processList.manualActionRequired")}
          </Text>
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
  );
}

export function IndexProvisioningTreeScope() {
  const { t } = useTranslation("common");
  const { filter, setFilter, summary } = useIndexProvisioningJobs();

  const filterOptions = ["all", "creating", "failed", "ready"] as const;

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="space-y-1 text-left">
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
    </div>
  );
}

export function IndexProvisioningTreeJobs() {
  const { t } = useTranslation("common");
  const { selectedIndexSignature, selectIndexJob } = useDebugger();
  const { filteredIndexes, statusQuery } = useIndexProvisioningJobs();

  if (statusQuery.isLoading) {
    return (
      <Text className="text-muted-foreground px-2 py-3 text-sm">
        {t("loading")}
      </Text>
    );
  }

  if (statusQuery.isError) {
    return (
      <Text className="text-destructive px-2 py-3 text-sm">
        {t("indexProvisioning.processList.loadError")}
      </Text>
    );
  }

  if (filteredIndexes.length === 0) {
    return (
      <Text className="text-muted-foreground px-2 py-3 text-sm">
        {t("indexProvisioning.processList.empty")}
      </Text>
    );
  }

  return (
    <ul className="space-y-2 px-1">
      {filteredIndexes.map((job) => (
        <li key={job.signature}>
          <IndexJobTreeRow
            job={job}
            isSelected={selectedIndexSignature === job.signature}
            onSelect={() => selectIndexJob(job.signature)}
          />
        </li>
      ))}
    </ul>
  );
}
