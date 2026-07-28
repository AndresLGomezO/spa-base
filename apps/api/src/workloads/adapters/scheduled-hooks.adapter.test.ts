import { describe, expect, it } from "vitest";

import { hookToWorkloadRecord } from "./scheduled-hooks.adapter.js";

describe("hookToWorkloadRecord", () => {
  it("emits schedule and infers domain from hook metadata", () => {
    const record = hookToWorkloadRecord("tenant-a", {
      id: "hook-1",
      name: "Gmail digest",
      entity: "emailMessage",
      description: "Daily gmail summary",
      enabled: true,
      trigger: { kind: "schedule", cron: "0 9 * * *", timezone: "UTC" },
      actions: [],
    } as never);

    expect(record.domain).toBe("email");
    expect(record.enabled).toBe(true);
    expect(record.schedule).toEqual({
      cron: "0 9 * * *",
      timezone: "UTC",
    });
    expect(record.kind).toBe("scheduledDataHook");
  });
});
