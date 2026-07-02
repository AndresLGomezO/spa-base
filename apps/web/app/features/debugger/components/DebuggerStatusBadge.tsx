import { useTranslation } from "react-i18next";

import type { DebugEventStatus } from "../../../lib/api-client";
import {
  DEBUGGER_STATUS_BADGE_CLASS,
  DEBUGGER_STATUS_DOT_CLASS,
} from "../debugger-status-styles";

export function debuggerStatusLabelKey(
  status: DebugEventStatus | string,
): `debugger.status.${DebugEventStatus}` {
  return `debugger.status.${status}` as `debugger.status.${DebugEventStatus}`;
}

export function DebuggerStatusBadge({
  status,
  variant = "badge",
  size = "default",
}: {
  readonly status?: DebugEventStatus | string;
  readonly variant?: "badge" | "dot";
  readonly size?: "default" | "compact";
}) {
  const { t } = useTranslation("common");

  if (!status) {
    return null;
  }

  const label = t(debuggerStatusLabelKey(status), { defaultValue: status });

  if (variant === "dot") {
    return (
      <span
        className={`inline-block size-2 shrink-0 rounded-full ${
          DEBUGGER_STATUS_DOT_CLASS[status] ?? "bg-muted-foreground/60"
        }`}
        title={label}
        aria-label={label}
      />
    );
  }

  const sizeClass =
    size === "compact"
      ? "px-1.5 py-0 text-[10px] leading-4"
      : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 rounded-full font-medium ${sizeClass} ${
        DEBUGGER_STATUS_BADGE_CLASS[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}
