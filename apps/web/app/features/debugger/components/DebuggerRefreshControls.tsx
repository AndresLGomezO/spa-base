import { Button, Spinner, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useDebugger } from "../debugger-context";
import { DEBUGGER_LIST_ROW_HOVER_CLASS } from "../debugger-status-styles";

function formatRelativeTime(timestampMs: number, locale: string): string {
  const deltaMs = timestampMs - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const absSeconds = Math.round(Math.abs(deltaMs) / 1000);
  if (absSeconds < 60) {
    return rtf.format(Math.round(deltaMs / 1000), "second");
  }
  const absMinutes = Math.round(absSeconds / 60);
  if (absMinutes < 60) {
    return rtf.format(Math.round(deltaMs / 60_000), "minute");
  }
  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) {
    return rtf.format(Math.round(deltaMs / 3_600_000), "hour");
  }
  return rtf.format(Math.round(deltaMs / 86_400_000), "day");
}

export function DebuggerLastUpdatedLabel({
  className,
}: {
  readonly className?: string;
}) {
  const { t, i18n } = useTranslation("common");
  const { lastUpdatedAt, refresh, isLoading, isRefreshing } = useDebugger();
  const [, tick] = useState(0);

  useEffect(() => {
    if (lastUpdatedAt == null) {
      return;
    }
    const intervalId = window.setInterval(() => {
      tick((current) => current + 1);
    }, 5_000);
    return () => window.clearInterval(intervalId);
  }, [lastUpdatedAt]);

  if (lastUpdatedAt == null) {
    return null;
  }

  const relativeTime = formatRelativeTime(lastUpdatedAt, i18n.language);

  return (
    <button
      type="button"
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors",
        className,
      )}
      onClick={() => void refresh()}
      disabled={isLoading || isRefreshing}
      aria-label={t("debugger.summary.updatedRefreshAria", {
        time: relativeTime,
      })}
    >
      <RefreshCw
        aria-hidden
        className={cn(
          "size-3.5 shrink-0",
          isRefreshing && "animate-spin motion-reduce:animate-none",
        )}
      />
      <span>
        {t("debugger.summary.updatedRefresh", { time: relativeTime })}
      </span>
    </button>
  );
}

export function DebuggerRefreshButton() {
  const { t } = useTranslation("common");
  const { refresh, isLoading, isRefreshing } = useDebugger();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => void refresh()}
      disabled={isLoading || isRefreshing}
    >
      <RefreshCw
        aria-hidden
        className={cn(
          "mr-2 size-4",
          isRefreshing && "animate-spin motion-reduce:animate-none",
        )}
      />
      {isRefreshing
        ? t("debugger.actions.refreshing")
        : t("debugger.actions.refresh")}
    </Button>
  );
}

export function DebuggerRefreshRow() {
  const { t } = useTranslation("common");
  const { refresh, isLoading, isRefreshing } = useDebugger();

  return (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
        DEBUGGER_LIST_ROW_HOVER_CLASS,
      )}
      onClick={() => void refresh()}
      disabled={isLoading || isRefreshing}
    >
      <RefreshCw
        aria-hidden
        className={cn(
          "text-muted-foreground size-4 shrink-0",
          isRefreshing && "animate-spin motion-reduce:animate-none",
        )}
      />
      <Text className="text-sm font-medium">
        {isRefreshing
          ? t("debugger.actions.refreshing")
          : t("debugger.actions.refresh")}
      </Text>
    </button>
  );
}

export function DebuggerRefreshingOverlay() {
  const { t } = useTranslation("common");
  const { isRefreshing } = useDebugger();

  if (!isRefreshing) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-background/40 pt-8"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{t("debugger.summary.refreshingData")}</span>
      <Spinner size="sm" ariaLabel={t("debugger.summary.refreshingData")} />
    </div>
  );
}
