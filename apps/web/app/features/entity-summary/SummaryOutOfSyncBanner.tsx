import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { AiSparkIcon, Button, Text, toast } from "@repo/ui";
import { RefreshCw } from "lucide-react";

import { useAiSpendActionGuard } from "../ai-spend/use-ai-spend-action-guard";
import { refreshAiRecordNarrative } from "../../lib/api-client";

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
  const { beforeAiAction, handleAiActionError } = useAiSpendActionGuard(stale);

  if (!stale) return null;

  return (
    <div
      className="relative overflow-hidden rounded-xl border px-3.5 py-3"
      style={{
        borderColor: "color-mix(in oklab, #8b5cf6 28%, var(--color-border))",
        backgroundImage:
          "radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, #f59e0b 16%, transparent), transparent 55%), radial-gradient(90% 80% at 0% 100%, color-mix(in oklab, #8b5cf6 12%, transparent), transparent 50%), linear-gradient(color-mix(in oklab, var(--color-muted) 40%, transparent), color-mix(in oklab, var(--color-background) 70%, transparent))",
        boxShadow:
          "0 0 0 1px color-mix(in oklab, #22d3ee 8%, transparent), 0 10px 28px color-mix(in oklab, #8b5cf6 8%, transparent)",
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, #f59e0b 28%, transparent), color-mix(in oklab, #8b5cf6 22%, transparent))",
              boxShadow:
                "0 0 20px color-mix(in oklab, #f59e0b 22%, transparent)",
            }}
          >
            <AiSparkIcon size={18} animated className="text-primary" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <Text className="text-foreground text-sm font-medium leading-snug">
              {t("entity.summary.outOfSyncTitle")}
            </Text>
            <Text className="text-muted-foreground text-xs leading-relaxed">
              {t("entity.summary.outOfSyncDescription")}
            </Text>
          </div>
        </div>
        <Button
          type="button"
          variant="ai"
          size="sm"
          className="shrink-0 self-stretch sm:self-center"
          disabled={refreshing}
          onClick={() => {
            if (!beforeAiAction()) {
              return;
            }
            void (async () => {
              setRefreshing(true);
              try {
                await refreshAiRecordNarrative(entityName, recordId, variant);
                toast.success(t("entity.summary.refreshQueued"));
                await queryClient.invalidateQueries({
                  queryKey: ["ai-record-summary", entityName, recordId],
                });
                onRefreshed?.();
              } catch (error) {
                if (!handleAiActionError(error)) {
                  toast.error(t("entity.summary.refreshFailed"));
                }
              } finally {
                setRefreshing(false);
              }
            })();
          }}
        >
          <RefreshCw
            className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden
          />
          {refreshing
            ? t("entity.summary.refreshing")
            : t("entity.summary.refreshAction")}
        </Button>
      </div>
    </div>
  );
}
