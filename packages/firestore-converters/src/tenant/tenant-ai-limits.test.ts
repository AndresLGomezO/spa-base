import { describe, expect, it } from "vitest";

import { tenantConverter } from "./schema.latest.js";

describe("tenantConverter schema v4", () => {
  it("migrates v2 documents through v3 into v4 with defaultLocale", () => {
    const migrated = tenantConverter.read({
      id: "tenant_a",
      name: "Tenant A",
      status: "active",
      createdBy: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      _schemaVersion: 2,
    });

    expect(migrated.aiLimits).toBeUndefined();
    expect(migrated.defaultLocale).toBe("en");

    const written = tenantConverter.write({
      ...migrated,
      aiLimits: {
        monthlyInputTokens: 1000,
        monthlyBudgetUsd: 12.5,
      },
    });

    expect(written._schemaVersion).toBe(4);
    expect(written.defaultLocale).toBe("en");
    expect(written.aiLimits).toEqual({
      monthlyInputTokens: 1000,
      monthlyBudgetUsd: 12.5,
    });
  });

  it("migrates v3 documents and fills defaultLocale", () => {
    const migrated = tenantConverter.read({
      id: "tenant_b",
      name: "Tenant B",
      status: "active",
      createdBy: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      aiLimits: { monthlyInputTokens: 500 },
      _schemaVersion: 3,
    });

    expect(migrated.defaultLocale).toBe("en");
    expect(migrated.aiLimits).toEqual({ monthlyInputTokens: 500 });
  });
});
