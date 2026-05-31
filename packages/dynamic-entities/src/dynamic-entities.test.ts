import { beforeEach, describe, expect, it } from "vitest";

import {
  clearEntityRegistry,
  defineEntity,
  registerEntity,
} from "@repo/entities";

import {
  assertDynamicNameAvailable,
  clearDynamicEntityRegistry,
  defineEntityFromRecord,
  DynamicEntityError,
  getEntitiesForTenant,
  getDynamicPermissionsForTenant,
  registerDynamicEntity,
  resolveEntity,
  validateDefinitionEvolution,
} from "./index.js";
import type { EntityDefinitionRecord } from "./types.js";

const baseRecord: EntityDefinitionRecord = {
  id: "def_1",
  tenantId: "tenant_a",
  name: "loan",
  label: "Loans",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  fields: [
    { name: "amount", type: "number", required: true },
    {
      name: "status",
      type: "enum",
      enumValues: ["Pending", "Approved"],
      required: true,
    },
  ],
};

describe("@repo/dynamic-entities", () => {
  beforeEach(() => {
    clearDynamicEntityRegistry();
    clearEntityRegistry();
  });

  it("builds a defined entity from a stored record", () => {
    const entity = defineEntityFromRecord(baseRecord);
    expect(entity.name).toBe("loan");
    expect(entity.metadata.permissions).toEqual([
      "loan.read",
      "loan.read_all",
      "loan.create",
      "loan.update",
      "loan.write_all",
      "loan.delete",
      "loan.delete_all",
      "loan.manage_shares",
    ]);
  });

  it("builds field UI without defaulting labels to raw field names", () => {
    const entity = defineEntityFromRecord(baseRecord);
    expect(entity.metadata.ui?.fields?.amount?.label).toBeUndefined();
    expect(entity.metadata.ui?.fields?.amount?.component).toBe("number");
  });

  it("passes display metadata from field ui config", () => {
    const entity = defineEntityFromRecord({
      ...baseRecord,
      fields: [
        {
          name: "amount",
          type: "number",
          required: true,
          ui: { displayFormat: "currency" },
        },
        {
          name: "openDate",
          type: "date",
          ui: { dateDisplayFormat: "date" },
        },
        ...baseRecord.fields.slice(1),
      ],
    });

    expect(entity.metadata.ui?.fields?.amount?.displayFormat).toBe("currency");
    expect(entity.metadata.ui?.fields?.openDate?.dateDisplayFormat).toBe(
      "date",
    );
  });

  it("assigns field order from field ui config or array index", () => {
    const entity = defineEntityFromRecord({
      ...baseRecord,
      fields: [
        { name: "amount", type: "number", required: true, ui: { order: 2 } },
        {
          name: "status",
          type: "enum",
          enumValues: ["Pending", "Approved"],
          required: true,
          ui: { order: 0 },
        },
      ],
    });

    expect(entity.metadata.ui?.fields?.status?.order).toBe(0);
    expect(entity.metadata.ui?.fields?.amount?.order).toBe(2);
  });

  it("registers and resolves tenant dynamic entities", () => {
    registerDynamicEntity("tenant_a", baseRecord);
    expect(resolveEntity("loan", "tenant_a")?.name).toBe("loan");
    expect(resolveEntity("loan", "tenant_b")).toBeUndefined();
    expect(
      getEntitiesForTenant("tenant_a").some((e) => e.name === "loan"),
    ).toBe(true);
  });

  it("rejects static name collisions", () => {
    registerEntity(
      defineEntity({
        name: "widget",
        fields: { name: { type: "string", required: true } },
      }),
    );
    expect(() => assertDynamicNameAvailable("widget")).toThrow(
      DynamicEntityError,
    );
  });

  it("validates schema evolution rules", () => {
    const next: EntityDefinitionRecord = {
      ...baseRecord,
      fields: [...baseRecord.fields, { name: "notes", type: "string" }],
      version: 2,
    };
    expect(() => validateDefinitionEvolution(baseRecord, next)).not.toThrow();

    const invalid: EntityDefinitionRecord = {
      ...baseRecord,
      fields: [{ name: "amount", type: "string", required: true }],
    };
    expect(() => validateDefinitionEvolution(baseRecord, invalid)).toThrow(
      /type cannot be changed/,
    );
  });

  it("derives dynamic permissions for a tenant", () => {
    registerDynamicEntity("tenant_a", baseRecord);
    expect(getDynamicPermissionsForTenant("tenant_a")).toEqual([
      "loan.read",
      "loan.read_all",
      "loan.create",
      "loan.update",
      "loan.write_all",
      "loan.delete",
      "loan.delete_all",
      "loan.manage_shares",
    ]);
  });
});
