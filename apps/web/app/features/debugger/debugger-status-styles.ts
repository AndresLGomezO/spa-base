import type {
  DebugEvent,
  DebugEventSource,
  DebugEventStatus,
} from "../../lib/api-client";

export const DEBUGGER_STATUSES_BY_SOURCE: Record<
  DebugEventSource,
  readonly DebugEventStatus[]
> = {
  ai: ["running", "pending", "failed", "completed"],
  hookExecution: ["running", "pending", "success", "error", "skipped"],
  hookLog: ["info", "error"],
  audit: ["info"],
  requestPerf: ["success", "error"],
  indexProvision: ["running", "success", "error", "info"],
  emailIngest: ["running", "pending", "failed", "completed", "info", "skipped"],
};

/** Badge surfaces — aligned with CardFieldBadge / theme badge tokens. */
export const DEBUGGER_STATUS_BADGE_CLASS: Record<string, string> = {
  success: "bg-badge-success text-badge-success-foreground",
  completed: "bg-badge-success text-badge-success-foreground",
  error: "bg-badge-danger text-badge-danger-foreground",
  failed: "bg-badge-danger text-badge-danger-foreground",
  skipped: "bg-badge-default text-badge-default-foreground",
  info: "bg-badge-info text-badge-info-foreground",
  running: "bg-badge-warning text-badge-warning-foreground",
  pending: "bg-badge-warning text-badge-warning-foreground",
  queued: "bg-badge-warning text-badge-warning-foreground",
};

/** Row left accent — semantic border tokens from theme. */
export const DEBUGGER_STATUS_ACCENT_CLASS: Record<string, string> = {
  success: "border-l-success",
  completed: "border-l-success",
  error: "border-l-destructive",
  failed: "border-l-destructive",
  skipped: "border-l-muted-foreground/40",
  info: "border-l-info",
  running: "border-l-warning",
  pending: "border-l-warning",
  queued: "border-l-warning",
};

/** Dot indicators — semantic foreground tokens from theme. */
export const DEBUGGER_STATUS_DOT_CLASS: Record<string, string> = {
  success: "bg-success",
  completed: "bg-success",
  error: "bg-destructive",
  failed: "bg-destructive",
  skipped: "bg-muted-foreground/60",
  info: "bg-info",
  running: "bg-warning",
  pending: "bg-warning",
  queued: "bg-warning",
};

const STATUS_SORT_PRIORITY: Record<string, number> = {
  failed: 0,
  error: 0,
  running: 1,
  pending: 1,
  queued: 1,
  skipped: 2,
  success: 3,
  completed: 3,
  info: 4,
};

export const DEBUGGER_LIST_ROW_HOVER_CLASS = "hover:bg-muted";
export const DEBUGGER_LIST_ROW_SELECTED_CLASS =
  "bg-primary/10 hover:bg-primary/15 ring-primary ring-2 ring-inset";

export type DebuggerListSort = "newest" | "oldest" | "status" | "title";

export const DEFAULT_DEBUGGER_LIST_SORT: DebuggerListSort = "newest";

export function debuggerStatusSortPriority(
  status: DebugEventStatus | undefined,
): number {
  if (!status) {
    return 5;
  }
  return STATUS_SORT_PRIORITY[status] ?? 5;
}

export function debuggerEventSearchHaystack(event: DebugEvent): string {
  const summary = event.summary ?? {};
  const parts = [
    event.title,
    event.subtitle,
    typeof summary.hookId === "string" ? summary.hookId : "",
    typeof summary.hookName === "string" ? summary.hookName : "",
    typeof summary.entityName === "string" ? summary.entityName : "",
    typeof summary.event === "string" ? summary.event : "",
    typeof summary.recordId === "string" ? summary.recordId : "",
    typeof summary.message === "string" ? summary.message : "",
    typeof summary.error === "string" ? summary.error : "",
    typeof summary.executionMode === "string" ? summary.executionMode : "",
  ];
  return parts.join(" ").toLowerCase();
}

export function isDebuggerListSort(value: string): value is DebuggerListSort {
  return (
    value === "newest" ||
    value === "oldest" ||
    value === "status" ||
    value === "title"
  );
}
