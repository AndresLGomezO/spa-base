import type { DebugEvent } from "../../lib/api-client";

import { buildDebugRecordKey } from "./dismissed-debug-records";
import { totalHookExecutionWritesFromEvent } from "./hook-execution-presentation";

export function preferDebugEvent(
  existing: DebugEvent | undefined,
  incoming: DebugEvent,
): DebugEvent {
  if (!existing) {
    return incoming;
  }

  const incomingTimestamp = Date.parse(incoming.timestamp);
  const existingTimestamp = Date.parse(existing.timestamp);
  if (
    Number.isFinite(incomingTimestamp) &&
    Number.isFinite(existingTimestamp) &&
    incomingTimestamp > existingTimestamp
  ) {
    return incoming;
  }

  if (incoming.timestamp === existing.timestamp) {
    const incomingWrites = totalHookExecutionWritesFromEvent(incoming);
    const existingWrites = totalHookExecutionWritesFromEvent(existing);
    if (incomingWrites >= existingWrites) {
      return incoming;
    }
  }

  if (incoming.status !== existing.status) {
    return incoming;
  }

  const incomingWrites = totalHookExecutionWritesFromEvent(incoming);
  const existingWrites = totalHookExecutionWritesFromEvent(existing);
  if (incomingWrites > existingWrites) {
    return incoming;
  }

  return existing;
}

export function mergeAccumulatedDebugEvents(
  accumulated: ReadonlyMap<string, DebugEvent>,
  pages: readonly { readonly items: readonly DebugEvent[] }[],
): Map<string, DebugEvent> {
  const next = new Map(accumulated);

  for (const page of pages) {
    for (const event of page.items) {
      const key = buildDebugRecordKey(event.source, event.id);
      next.set(key, preferDebugEvent(next.get(key), event));
    }
  }

  return next;
}

export function sortDebugEventsByTimestamp(
  events: Iterable<DebugEvent>,
): DebugEvent[] {
  return [...events].sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp),
  );
}
