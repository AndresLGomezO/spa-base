import cronParser from "cron-parser";

import type { WorkloadSchedule } from "./workload.js";

export function getNextCronOccurrence(
  cron: string,
  options?: { readonly timezone?: string; readonly from?: Date },
): Date | null {
  try {
    const interval = cronParser.parseExpression(cron.trim(), {
      tz: options?.timezone?.trim() || "UTC",
      currentDate: options?.from ?? new Date(),
    });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

export function getPreviousCronOccurrence(
  cron: string,
  options?: { readonly timezone?: string; readonly from?: Date },
): Date | null {
  try {
    const interval = cronParser.parseExpression(cron.trim(), {
      tz: options?.timezone?.trim() || "UTC",
      currentDate: options?.from ?? new Date(),
    });
    return interval.prev().toDate();
  } catch {
    return null;
  }
}

function parseIso(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface WorkloadScheduleTiming {
  readonly nextAt: Date | null;
  readonly lastAt: Date | null;
  /** True when nextAt came from live GCP/state rather than cron math. */
  readonly nextFromLive: boolean;
  /** True when lastAt came from live GCP/state rather than cron math. */
  readonly lastFromLive: boolean;
}

/**
 * Prefer live scheduler fields when present; otherwise derive from cron.
 * Used for sorting "next to run" and detail countdown.
 */
export function resolveWorkloadScheduleTiming(
  input: {
    readonly schedule?: WorkloadSchedule;
    readonly live?: Record<string, unknown>;
  },
  now: Date = new Date(),
): WorkloadScheduleTiming {
  const live = input.live ?? {};
  const nextLive = parseIso(live.nextRunTime ?? live.nextRunAt);
  const lastLive = parseIso(live.lastAttemptTime ?? live.lastRunAt);

  const cron = input.schedule?.cron?.trim();
  const timezone = input.schedule?.timezone;

  let nextAt: Date | null = null;
  let nextFromLive = false;
  if (nextLive && nextLive.getTime() >= now.getTime() - 60_000) {
    nextAt = nextLive;
    nextFromLive = true;
  } else if (cron) {
    nextAt = getNextCronOccurrence(cron, { timezone, from: now });
  }

  let lastAt: Date | null = null;
  let lastFromLive = false;
  if (lastLive) {
    lastAt = lastLive;
    lastFromLive = true;
  } else if (cron) {
    lastAt = getPreviousCronOccurrence(cron, { timezone, from: now });
  }

  return { nextAt, lastAt, nextFromLive, lastFromLive };
}

/** Milliseconds until next fire, or null when unknown / no schedule. */
export function msUntilNextRun(
  timing: Pick<WorkloadScheduleTiming, "nextAt">,
  now: Date = new Date(),
): number | null {
  if (!timing.nextAt) return null;
  return timing.nextAt.getTime() - now.getTime();
}
