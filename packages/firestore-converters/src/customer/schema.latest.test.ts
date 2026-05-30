import {
  CUSTOMER_SCHEMA_VERSION,
  persistedCustomerSchemaV1,
  type CustomerRecord,
} from "@repo/shared-types";
import { describe, expect, it } from "vitest";

import { customerConverter } from "./schema.latest.js";

describe("customerConverter", () => {
  it("round-trips domain records", () => {
    const record: CustomerRecord = {
      id: "cust_1",
      tenantId: "tenant_a",
      name: "Jane Doe",
      email: "jane@example.com",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const persisted = customerConverter.write(record);
    expect(persisted._schemaVersion).toBe(CUSTOMER_SCHEMA_VERSION);
    expect(customerConverter.read(persisted)).toEqual(record);
  });

  it("validates persisted shape", () => {
    const parsed = persistedCustomerSchemaV1.safeParse({
      id: "cust_1",
      tenantId: "tenant_a",
      name: "Jane Doe",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      _schemaVersion: CUSTOMER_SCHEMA_VERSION,
    });
    expect(parsed.success).toBe(true);
  });
});
