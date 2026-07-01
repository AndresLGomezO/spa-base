import type { DebugEventSource } from "../../lib/api-client";

export const DEBUGGER_SOURCE_ORDER: readonly DebugEventSource[] = [
  "ai",
  "hookExecution",
  "hookLog",
  "audit",
  "requestPerf",
];

export const DEBUGGER_SOURCE_ROUTE_SLUGS: Record<DebugEventSource, string> = {
  ai: "ai-jobs",
  hookExecution: "hook-executions",
  hookLog: "hook-logs",
  audit: "audit",
  requestPerf: "request-performance",
};

export const DEBUGGER_SOURCE_API_NAMES: Record<DebugEventSource, string> = {
  ai: "ai",
  hookExecution: "hooks",
  hookLog: "hookLogs",
  audit: "audit",
  requestPerf: "perf",
};

export function debuggerSourceLabelKey(
  source: DebugEventSource,
): `debugger.sources.${DebugEventSource}` {
  return `debugger.sources.${source}`;
}

export function debugEventSourceFromRouteSlug(
  slug: string | undefined,
): DebugEventSource | null {
  if (!slug) {
    return null;
  }
  const entry = Object.entries(DEBUGGER_SOURCE_ROUTE_SLUGS).find(
    ([, routeSlug]) => routeSlug === slug,
  );
  return entry ? (entry[0] as DebugEventSource) : null;
}
