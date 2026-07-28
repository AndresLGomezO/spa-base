export const WORKLOAD_FREQUENCIES = [
  "everyMinute",
  "everyNMinutes",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "custom",
  "onDemand",
] as const;
export type WorkloadFrequency = (typeof WORKLOAD_FREQUENCIES)[number];

export interface CronClassification {
  readonly frequency: WorkloadFrequency;
  /** Minutes from midnight when both minute and hour are fixed integers. */
  readonly minuteOfDay: number | null;
  /** 0–23 when hour is a fixed integer. */
  readonly hour: number | null;
}

function parseFixedInt(field: string | undefined): number | null {
  if (field == null) return null;
  if (!/^\d+$/.test(field)) return null;
  return Number(field);
}

function isEveryMinute(
  minute: string,
  hour: string,
  dom: string,
  month: string,
  dow: string,
): boolean {
  return (
    minute === "*" &&
    hour === "*" &&
    dom === "*" &&
    month === "*" &&
    dow === "*"
  );
}

function stepMinutes(minute: string): number | null {
  const match = /^\*\/(\d+)$/.exec(minute);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Classifies a standard 5-field cron (minute hour day-of-month month day-of-week).
 * Does not resolve lists/ranges into a single clock time — those become custom
 * with null minuteOfDay/hour unless both minute and hour are plain integers.
 */
export function classifyCron(cron: string): CronClassification {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { frequency: "custom", minuteOfDay: null, hour: null };
  }
  const [minute = "*", hour = "*", dom = "*", month = "*", dow = "*"] = parts;

  const fixedMinute = parseFixedInt(minute);
  const fixedHour = parseFixedInt(hour);
  const minuteOfDay =
    fixedMinute != null &&
    fixedHour != null &&
    fixedMinute >= 0 &&
    fixedMinute <= 59 &&
    fixedHour >= 0 &&
    fixedHour <= 23
      ? fixedHour * 60 + fixedMinute
      : null;
  const hourValue =
    fixedHour != null && fixedHour >= 0 && fixedHour <= 23 ? fixedHour : null;

  if (isEveryMinute(minute, hour, dom, month, dow)) {
    return { frequency: "everyMinute", minuteOfDay: null, hour: null };
  }

  const everyN = stepMinutes(minute);
  if (
    everyN != null &&
    hour === "*" &&
    dom === "*" &&
    month === "*" &&
    dow === "*"
  ) {
    return { frequency: "everyNMinutes", minuteOfDay: null, hour: null };
  }

  if (
    fixedMinute != null &&
    hour === "*" &&
    dom === "*" &&
    month === "*" &&
    dow === "*"
  ) {
    return { frequency: "hourly", minuteOfDay: null, hour: null };
  }

  if (
    fixedMinute != null &&
    fixedHour != null &&
    dom === "*" &&
    month === "*" &&
    dow === "*"
  ) {
    return { frequency: "daily", minuteOfDay, hour: hourValue };
  }

  if (
    fixedMinute != null &&
    fixedHour != null &&
    dom === "*" &&
    month === "*" &&
    dow !== "*"
  ) {
    return { frequency: "weekly", minuteOfDay, hour: hourValue };
  }

  if (
    fixedMinute != null &&
    fixedHour != null &&
    dom !== "*" &&
    month === "*" &&
    dow === "*"
  ) {
    return { frequency: "monthly", minuteOfDay, hour: hourValue };
  }

  return { frequency: "custom", minuteOfDay, hour: hourValue };
}

export function classifyWorkloadSchedule(
  schedule: { readonly cron: string } | undefined,
): CronClassification {
  if (!schedule?.cron?.trim()) {
    return { frequency: "onDemand", minuteOfDay: null, hour: null };
  }
  return classifyCron(schedule.cron);
}

export function formatScheduleClock(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const EMAIL_RE = /(gmail|email|mail)/i;
const AI_RE = /(ai|insight|narrative|memory|categor|embed|llm|gemini|openai)/i;
const METRICS_RE = /(metric|aggregat)/i;
const TENANT_RE = /(tenant|archive|purge)/i;

/** Infer domain for dynamic scheduled hooks from entity/name/description. */
export function inferWorkloadDomain(parts: {
  readonly entity?: string;
  readonly name?: string;
  readonly description?: string;
}): import("./workload.js").WorkloadDomain {
  const haystack = [parts.entity, parts.name, parts.description]
    .filter(Boolean)
    .join(" ");
  if (EMAIL_RE.test(haystack)) return "email";
  if (AI_RE.test(haystack)) return "ai";
  if (METRICS_RE.test(haystack)) return "metrics";
  if (TENANT_RE.test(haystack)) return "tenant";
  return "platform";
}
