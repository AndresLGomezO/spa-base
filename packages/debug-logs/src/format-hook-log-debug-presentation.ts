import type { HookLogMessageRecord } from "./hook-log-message.js";

const GENERIC_NOTIFICATION_MESSAGE = "Data hook notification";

const GENERIC_HOOK_LOG_MESSAGES = new Set([
  GENERIC_NOTIFICATION_MESSAGE,
  "Deferred data hook failed",
  "Failed to record data hook execution",
  "Data hook depth limit exceeded",
  "Queued data hook missing enqueue service; falling back to deferred execution",
]);

function isGenericHookLogMessage(message: string): boolean {
  return (
    message.length === 0 ||
    GENERIC_HOOK_LOG_MESSAGES.has(message) ||
    message.startsWith("Hook execution failed:")
  );
}

function readMetaString(
  meta: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = meta?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export interface HookLogDebugPresentation {
  readonly title: string;
  readonly subtitle?: string;
  readonly summary: Record<string, unknown>;
}

export function formatHookLogDebugPresentation(
  record: HookLogMessageRecord,
): HookLogDebugPresentation {
  const meta = record.meta;
  const hookId = record.hookId ?? readMetaString(meta, "hookId");
  const hookName = readMetaString(meta, "hookName");
  const entityName = record.entityName ?? readMetaString(meta, "entityName");
  const event = readMetaString(meta, "event");
  const recordId = readMetaString(meta, "recordId");
  const error = readMetaString(meta, "error");
  const action = readMetaString(meta, "action");
  const notificationMessage = readMetaString(meta, "message");

  const storedMessage = record.message.trim();
  const isGenericMessage = isGenericHookLogMessage(storedMessage);

  let title = storedMessage;
  if (isGenericMessage) {
    if (notificationMessage) {
      title = notificationMessage;
    } else if (error) {
      title = record.level === "error" ? `Hook error: ${error}` : error;
    } else if (hookName && event) {
      title = `${hookName} · ${event}`;
    } else if (event) {
      title = event;
    } else if (hookName) {
      title = hookName;
    } else {
      title = storedMessage || "Hook log";
    }
  }

  const subtitleParts = [
    entityName,
    event,
    hookName && hookName !== title ? hookName : undefined,
  ].filter((part): part is string => Boolean(part));
  const subtitle =
    subtitleParts.length > 0
      ? subtitleParts.join(" · ")
      : (hookId ?? undefined);

  return {
    title,
    subtitle,
    summary: {
      level: record.level,
      hookId,
      hookName,
      entityName,
      event,
      recordId,
      action,
      error,
      message:
        notificationMessage ?? (isGenericMessage ? undefined : storedMessage),
    },
  };
}
