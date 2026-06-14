import { AiBuilderLoadingIcon, Alert, Popover, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { AiJobProgress } from "../../lib/api-client";
import type { ProgressTimelineItem } from "./build-ui-builder-progress-timeline";
import { formatAiJobError } from "./use-ai-ui-builder";

interface UiBuilderAiProgressPopoverProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: React.ReactNode;
  readonly timeline: readonly ProgressTimelineItem[];
  readonly progress?: AiJobProgress | null;
  readonly jobError?: string | null;
  readonly hoverable?: boolean;
  readonly onHoverOpenChange?: (open: boolean) => void;
}

function TimelineIcon({
  status,
}: {
  readonly status: ProgressTimelineItem["status"];
}) {
  if (status === "done") {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check className="size-3" aria-hidden />
      </span>
    );
  }

  if (status === "running") {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center">
        <AiBuilderLoadingIcon size={16} label="" />
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span
        className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-destructive"
        aria-hidden
      />
    );
  }

  return (
    <span
      className="mt-0.5 size-4 shrink-0 rounded-full border border-muted-foreground/40"
      aria-hidden
    />
  );
}

export function UiBuilderAiProgressPopover({
  open,
  onOpenChange,
  trigger,
  timeline,
  progress,
  jobError,
  hoverable = true,
  onHoverOpenChange,
}: UiBuilderAiProgressPopoverProps) {
  const { t } = useTranslation("common");
  const formattedJobError = jobError
    ? formatAiJobError(jobError, (key) => t(key as never))
    : null;

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      placement="bottom-end"
      title={t("uiBuilderAi.progressTitle")}
      panelClassName="w-80"
      hoverable={hoverable}
      openOnClick={false}
      onHoverOpenChange={onHoverOpenChange}
    >
      <div className="space-y-3 p-1">
        {progress ? (
          <Text className="text-xs text-muted-foreground">
            {t("uiBuilderAi.progress.stepCounter", {
              current: progress.stepIndex,
              total: progress.totalSteps,
            })}
          </Text>
        ) : null}
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {timeline.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex gap-2",
                item.status === "pending" && "opacity-60",
              )}
            >
              <TimelineIcon status={item.status} />
              <div className="min-w-0 flex-1">
                <Text className="text-sm leading-snug">{item.title}</Text>
                {item.detail ? (
                  <Text className="text-xs text-muted-foreground">
                    {item.detail}
                  </Text>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {formattedJobError ? <Alert>{formattedJobError}</Alert> : null}
      </div>
    </Popover>
  );
}
