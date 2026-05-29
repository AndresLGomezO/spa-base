import { describe, expect, it } from "vitest";

import { orderConverter } from "./schema.latest.js";

describe("orderConverter", () => {
  it("writes documents as latest schema version", () => {
    const now = new Date().toISOString();
    const persisted = orderConverter.write({
      id: "ord_1",
      tenantId: "tenant_a",
      orderNumber: "ORD-1001",
      total: 42.5,
      customerId: "cust_1",
      placedAt: now,
      isFulfilled: false,
      createdAt: now,
      updatedAt: now,
      legacyField: "must_be_removed",
    });

    expect(persisted._schemaVersion).toBe(2);
    expect(persisted.customerId).toBe("cust_1");
    expect("legacyField" in persisted).toBe(false);
  });

  it("reads an existing latest document", () => {
    const now = new Date().toISOString();
    const domain = orderConverter.read({
      _schemaVersion: 2,
      id: "ord_2",
      tenantId: "tenant_a",
      orderNumber: "ORD-1002",
      total: 99.99,
      customerId: "cust_2",
      placedAt: now,
      isFulfilled: true,
      createdAt: now,
      updatedAt: now,
    });

    expect(domain.id).toBe("ord_2");
    expect(domain.orderNumber).toBe("ORD-1002");
    expect(domain.customerId).toBe("cust_2");
    expect(domain.isFulfilled).toBe(true);
  });

  it("migrates v1 documents when customerId is present", () => {
    const now = new Date().toISOString();
    const domain = orderConverter.read({
      _schemaVersion: 1,
      id: "ord_3",
      tenantId: "tenant_a",
      orderNumber: "ORD-1003",
      total: 12,
      customerId: "cust_3",
      placedAt: now,
      isFulfilled: false,
      createdAt: now,
      updatedAt: now,
    });

    expect(domain.customerId).toBe("cust_3");
  });
});
