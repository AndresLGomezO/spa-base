import { describe, expect, it } from "vitest";

import type { EntityDefinitionRecord } from "@repo/dynamic-entities";

import {
  createRatesRecordSeedContext,
  createSeedHookEntityRuntime,
  deleteRatesRecordsNotInSet,
  importRatesRecordsBatch,
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

describe("importRatesRecordsBatch", () => {
  it("no-ops for empty record lists", async () => {
    const context = createRatesRecordSeedContext(
      "rates",
      { projectId: "demo" },
      [paymentScheduleRecord],
      "owner_123",
    );

    await expect(
      importRatesRecordsBatch(context, "paymentSchedule", []),
    ).resolves.toBeUndefined();
  });

  it("throws when the entity is not registered on the seed context", async () => {
    const context = createRatesRecordSeedContext(
      "rates",
      { projectId: "demo" },
      [paymentScheduleRecord],
      "owner_123",
    );

    await expect(
      importRatesRecordsBatch(context, "missingEntity", [
        {
          id: "ps_1",
          business: { financialItemId: "fi_1", dueDate: "2026-01-01" },
        },
      ]),
    ).rejects.toThrow('Entity "missingEntity" is not registered');
  });
});

describe("deleteRatesRecordsNotInSet", () => {
  it("throws when the entity is not registered on the seed context", async () => {
    const context = createRatesRecordSeedContext(
      "rates",
      { projectId: "demo" },
      [paymentScheduleRecord],
      "owner_123",
    );

    await expect(
      deleteRatesRecordsNotInSet(context, "missingEntity", new Set(["a"])),
    ).rejects.toThrow('Entity "missingEntity" is not registered');
  });
});
