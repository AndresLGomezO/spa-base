import cronParser from "cron-parser";

import type { DataHookDefinition } from "./data-hook-definition.js";
import {
  isScheduleTrigger,
  type DataHookScheduleTrigger,
} from "./data-hook-definition.js";
import { formatHookEvent } from "./event.js";
import type { HookContext, HookUser } from "./types.js";
import { HookExecutionError } from "./types.js";

/** Safety ceiling for `eachRecord` schedule fan-out per hook per tick. */
export const MAX_SCHEDULED_RECORDS_PER_RUN = 10_000;

export const SCHEDULED_HOOK_SENTINEL_ID = "__scheduled__" as const;

export function getScheduleScope(
  trigger: DataHookScheduleTrigger,
): "once" | "eachRecord" {
  return trigger.scope ?? "once";
}

export function getScheduleTimezone(trigger: DataHookScheduleTrigger): string {
  return trigger.timezone?.trim() || "UTC";
}

export function validateCronExpression(cron: string): void {
  try {
    cronParser.parseExpression(cron.trim(), { tz: "UTC" });
  } catch {
    throw new HookExecutionError(`Invalid cron expression: "${cron}".`);
  }
}

export function validateTimezone(timezone: string): void {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    throw new HookExecutionError(`Invalid timezone: "${timezone}".`);
  }
}

export function isCronDueNow(
  cron: string,
  timezone: string,
  at: Date,
): boolean {
  validateCronExpression(cron);
  validateTimezone(timezone);

  const zonedMinute = truncateToMinuteInTimezone(at, timezone);
  const prevMinute = new Date(zonedMinute.getTime() - 60_000);

  try {
    const interval = cronParser.parseExpression(cron.trim(), {
      tz: timezone,
      currentDate: prevMinute,
    });
    const next = interval.next().toDate();
    return truncateToMinuteUtc(next).getTime() === zonedMinute.getTime();
  } catch {
    return false;
  }
}

function truncateToMinuteUtc(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      0,
      0,
    ),
  );
}

function truncateToMinuteInTimezone(at: Date, timezone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);

  const lookup = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "0";

  const year = Number.parseInt(lookup("year"), 10);
  const month = Number.parseInt(lookup("month"), 10);
  const day = Number.parseInt(lookup("day"), 10);
  const hour = Number.parseInt(lookup("hour"), 10);
  const minute = Number.parseInt(lookup("minute"), 10);

  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
}

export function listDueScheduledHooks(
  definitions: readonly DataHookDefinition[],
  at: Date,
  options?: { readonly force?: boolean },
): readonly DataHookDefinition[] {
  return definitions.filter((definition) => {
    if (!definition.enabled || !isScheduleTrigger(definition.trigger)) {
      return false;
    }
    if (definition.phase !== "after") {
      return false;
    }

    if (options?.force) {
      return true;
    }

    const trigger = definition.trigger;
    const timezone = getScheduleTimezone(trigger);
    return isCronDueNow(trigger.cron, timezone, at);
  });
}

export function buildScheduledHookContext(options: {
  readonly definition: DataHookDefinition;
  readonly tenantId: string;
  readonly user: HookUser;
  readonly at: Date;
  readonly current: Record<string, unknown>;
  readonly previous?: Record<string, unknown>;
  readonly services: HookContext["services"];
}): HookContext {
  const event = formatHookEvent({
    entity: options.definition.entity,
    phase: "after",
    operation: "schedule",
  });

  return {
    tenantId: options.tenantId,
    entityName: options.definition.entity,
    event,
    current: { ...options.current },
    ...(options.previous ? { previous: { ...options.previous } } : {}),
    user: options.user,
    depth: 0,
    visitedHookIds: new Set<string>(),
    services: options.services,
  };
}

export function buildSyntheticScheduledRecord(
  tenantId: string,
  at: Date,
): Record<string, unknown> {
  return {
    id: SCHEDULED_HOOK_SENTINEL_ID,
    tenantId,
    scheduledAt: at.toISOString(),
  };
}
