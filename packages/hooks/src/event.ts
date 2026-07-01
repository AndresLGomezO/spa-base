import type { HookOperation, HookPhase, ParsedHookEvent } from "./types.js";
import { HookExecutionError } from "./types.js";

const EVENT_SUFFIXES: ReadonlyArray<{
  readonly suffix: string;
  readonly phase: HookPhase;
  readonly operation: HookOperation;
}> = [
  { suffix: "beforeCreate", phase: "before", operation: "create" },
  { suffix: "afterCreate", phase: "after", operation: "create" },
  { suffix: "beforeUpdate", phase: "before", operation: "update" },
  { suffix: "afterUpdate", phase: "after", operation: "update" },
  { suffix: "beforeDelete", phase: "before", operation: "delete" },
  { suffix: "afterDelete", phase: "after", operation: "delete" },
  { suffix: "afterSchedule", phase: "after", operation: "schedule" },
];

export function formatHookEvent(parsed: ParsedHookEvent): string {
  const suffix = EVENT_SUFFIXES.find(
    (entry) =>
      entry.phase === parsed.phase && entry.operation === parsed.operation,
  )?.suffix;

  if (!suffix) {
    throw new HookExecutionError(
      `Unsupported hook operation: ${parsed.phase}${parsed.operation}`,
    );
  }

  return `${parsed.entity}.${suffix}`;
}

export function parseHookEvent(event: string): ParsedHookEvent {
  for (const entry of EVENT_SUFFIXES) {
    const prefix = `${entry.suffix}`;
    if (event.endsWith(`.${prefix}`)) {
      const entity = event.slice(0, -(prefix.length + 1));
      if (!entity) {
        break;
      }
      return {
        entity,
        phase: entry.phase,
        operation: entry.operation,
      };
    }
  }

  throw new HookExecutionError(`Invalid hook event: ${event}`);
}

export function isBeforePhase(phase: HookPhase): boolean {
  return phase === "before";
}
