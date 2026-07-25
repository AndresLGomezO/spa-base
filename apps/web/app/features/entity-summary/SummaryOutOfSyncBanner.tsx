import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Text, toast } from "@repo/ui";
import { RefreshCw } from "lucide-react";

import { AiSpendLimitBanner } from "../ai-spend/AiSpendLimitBanner";
import { useAiSpendStatus } from "../ai-spend/use-ai-spend-status";
import {
  isAiSpendLimitError,
  refreshAiRecordNarrative,
} from "../../lib/api-client";

interface SummaryOutOfSyncBannerProps {
  readonly entityName: string;
  readonly recordId: string;
  readonly variant?: string;
  readonly stale: boolean;
  readonly onRefreshed?: () => void;
}

export function SummaryOutOfSyncBanner({
  entityName,
  recordId,
  variant = "default",
  stale,
  onRefreshed,
}: SummaryOutOfSyncBannerProps) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { blocked, softWarn } = useAiSpendStatus(stale);

  if (!stale) return null;

  return (
    <div className="mb-4 space-y-2">
      <AiSpendLimitBanner blocked={blocked} softWarn={softWarn} />
      <div
        className="flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
        style={{
          borderColor: "color-mix(in oklab, #f59e0b 35%, var(--color-border))",
          background:
            "color-mix(in oklab, #f59e0b 10%, var(--color-background))",
        }}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <Text className="text-foreground text-sm font-medium">
            {t("entity.summary.outOfSync")}
          </Text>
          <Text className="text-muted-foreground text-xs leading-relaxed">
            {t("entity.summary.outOfSyncDescription")}
          </Text>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={refreshing || blocked}
          onClick={() => {
            void (async () => {
              setRefreshing(true);
              try {
                const result = await refreshAiRecordNarrative(
                  entityName,
                  recordId,
                  variant,
                );
                if (result.enqueued) {
                  toast.success(t("entity.summary.refreshQueued"));
                } else {
                  toast.success(t("entity.summary.refreshQueued"));
                }
                await queryClient.invalidateQueries({
                  queryKey: ["ai-record-summary", entityName, recordId],
                });
                onRefreshed?.();
              } catch (error) {
                toast.error(
                  isAiSpendLimitError(error)
                    ? t("aiSpend.limitReached")
                    : t("entity.summary.refreshFailed"),
                );
              } finally {
                setRefreshing(false);
              }
            })();
          }}
        >
          <RefreshCw
            className={`mr-1 size-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing
            ? t("entity.summary.refreshing")
            : t("entity.summary.refreshSummary")}
        </Button>
      </div>
    </div>
  );
}
