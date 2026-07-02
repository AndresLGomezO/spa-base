import { useTranslation } from "react-i18next";

import type { DebugEventStatus } from "../../../lib/api-client";
import { DEBUGGER_STATUS_BADGE_CLASS } from "../debugger-status-styles";
import { debuggerStatusLabelKey } from "./DebuggerStatusBadge";

export function DebuggerStatusSummary({
  counts,
}: {
  readonly counts: Readonly<Partial<Record<DebugEventStatus, number>>>;
}) {
  const { t } = useTranslation("common");

  const entries = (
    Object.entries(counts) as [DebugEventStatus, number][]
  ).filter(([, count]) => count > 0);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2 pb-1">
      {entries.map(([status, count]) => (
        <span
          key={status}
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
            DEBUGGER_STATUS_BADGE_CLASS[status] ??
            "bg-muted text-muted-foreground"
          }`}
        >
          {t("debugger.list.summary", {
            count,
            status: t(debuggerStatusLabelKey(status)),
          })}
        </span>
      ))}
    </div>
  );
}
