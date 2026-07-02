import { Text } from "@repo/ui";
import { Cloud, Hourglass, Loader2, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { HookExecutionLiveCounts } from "../../../lib/api-client";
import {
  hookExecutionLiveMetricLabelKey,
  hookExecutionLiveMetrics,
  hasHookExecutionLiveActivity,
  type HookExecutionLiveMetricKey,
} from "../hook-execution-live-metrics";

const LIVE_METRIC_ICONS: Record<
  HookExecutionLiveMetricKey,
  { readonly icon: typeof Loader2; readonly spin?: boolean }
> = {
  queuedPending: { icon: Hourglass },
  inlineRunning: { icon: Loader2, spin: true },
  deferredRunning: { icon: Timer, spin: true },
  cloudRunning: { icon: Cloud, spin: true },
};

export function DebuggerHookLiveStatus({
  live,
}: {
  readonly live: HookExecutionLiveCounts;
}) {
  const { t } = useTranslation("common");

  if (!hasHookExecutionLiveActivity(live)) {
    return null;
  }

  const metrics = hookExecutionLiveMetrics(live).filter(
    (metric) => metric.value > 0,
  );

  if (metrics.length === 0) {
    return null;
  }

  return (
    <div className="bg-muted/50 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md px-3 py-2">
      <Text className="text-muted-foreground text-xs font-medium">
        {t("debugger.summary.liveStatus")}
      </Text>
      {metrics.map((metric) => {
        const iconConfig = LIVE_METRIC_ICONS[metric.key];
        const Icon = iconConfig.icon;

        return (
          <span
            key={metric.key}
            className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums"
          >
            <Icon
              aria-hidden
              className={`text-muted-foreground size-3.5 ${iconConfig.spin ? "animate-spin motion-reduce:animate-none" : ""}`}
            />
            {t(hookExecutionLiveMetricLabelKey(metric.key))}: {metric.value}
          </span>
        );
      })}
    </div>
  );
}
