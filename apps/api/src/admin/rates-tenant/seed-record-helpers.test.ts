import { describe, expect, it } from "vitest";

import type { EntityDefinitionRecord } from "@repo/dynamic-entities";

import {
  createRatesRecordSeedContext,
  createSeedHookEntityRuntime,
} from "./seed-record-helpers.js";

const paymentScheduleRecord: EntityDefinitionRecord = {
  id: "def_payment_schedule",
  tenantId: "rates",
  name: "paymentSchedule",
  label: "Payment Schedules",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  fields: [
    {
      name: "financialItemId",
      type: "string",
      required: true,
    },
    {
      name: "dueDate",
      type: "date",
      required: true,
    },
  ],
};

describe("createSeedHookEntityRuntime", () => {
  it("resolves paymentSchedule from seed definition records", () => {
    const context = createRatesRecordSeedContext(
      "rates",
      { projectId: "demo" },
      [paymentScheduleRecord],
      "owner_123",
    );
    const runtime = createSeedHookEntityRuntime(context);

    expect(runtime.resolveEntity("paymentSchedule", "rates")?.name).toBe(
      "paymentSchedule",
    );
    expect(runtime.getRepository("rates", "paymentSchedule")).toBeDefined();
    expect(runtime.resolveEntity("paymentSchedule", "other")).toBeUndefined();
  });
});
