import { describe, expect, it } from "vitest";

import type { DataHookDefinition } from "./data-hook-definition.js";
import {
  buildSyntheticScheduledRecord,
  isCronDueNow,
  listDueScheduledHooks,
  validateCronExpression,
  validateTimezone,
} from "./schedule-trigger-utils.js";

describe("schedule-trigger-utils", () => {
  it("validates cron expressions", () => {
    expect(() => validateCronExpression("0 6 * * *")).not.toThrow();
    expect(() => validateCronExpression("not-a-cron")).toThrow(
      /Invalid cron expression/,
    );
  });

  it("validates timezones", () => {
    expect(() => validateTimezone("UTC")).not.toThrow();
    expect(() => validateTimezone("America/New_York")).not.toThrow();
    expect(() => validateTimezone("Not/AZone")).toThrow(/Invalid timezone/);
  });

  it("detects cron due at the configured minute", () => {
    const at = new Date("2026-07-01T06:00:00.000Z");
    expect(isCronDueNow("0 6 * * *", "UTC", at)).toBe(true);
    expect(isCronDueNow("0 7 * * *", "UTC", at)).toBe(false);
  });

  it("lists due scheduled hooks", () => {
    const at = new Date("2026-07-01T06:00:00.000Z");
    const dueHook: DataHookDefinition = {
      id: "h1",
      tenantId: "t1",
      name: "Due",
      entity: "task",
      phase: "after",
      trigger: { kind: "schedule", cron: "0 6 * * *", timezone: "UTC" },
      condition: null,
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "tick" },
        },
      ],
      enabled: true,
      order: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const notDueHook: DataHookDefinition = {
      ...dueHook,
      id: "h2",
      trigger: { kind: "schedule", cron: "0 7 * * *", timezone: "UTC" },
    };
    const crudHook: DataHookDefinition = {
      ...dueHook,
      id: "h3",
      trigger: { kind: "crud", operation: "create" },
    };

    expect(listDueScheduledHooks([dueHook, notDueHook, crudHook], at)).toEqual([
      dueHook,
    ]);
  });

  it("builds synthetic scheduled record", () => {
    const at = new Date("2026-07-01T06:00:00.000Z");
    expect(buildSyntheticScheduledRecord("tenant_a", at)).toEqual({
      id: "__scheduled__",
      tenantId: "tenant_a",
      scheduledAt: at.toISOString(),
    });
  });
});
