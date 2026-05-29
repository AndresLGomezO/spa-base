import { describe, expect, it } from "vitest";

import { customerConverter } from "./schema.latest.js";

describe("customerConverter", () => {
  it("writes documents as latest schema version", () => {
    const now = new Date().toISOString();
    const persisted = customerConverter.write({
      id: "cust_1",
      tenantId: "tenant_a",
      name: "Jane Doe",
      email: "jane@example.com",
      age: 30,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      legacyField: "must_be_removed",
    });

    expect(persisted._schemaVersion).toBe(1);
    expect("legacyField" in persisted).toBe(false);
  });

  it("reads an existing latest document", () => {
    const now = new Date().toISOString();
    const domain = customerConverter.read({
      _schemaVersion: 1,
      id: "cust_2",
      tenantId: "tenant_a",
      name: "John Doe",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    expect(domain.id).toBe("cust_2");
    expect(domain.tenantId).toBe("tenant_a");
    expect(domain.name).toBe("John Doe");
  });
});
