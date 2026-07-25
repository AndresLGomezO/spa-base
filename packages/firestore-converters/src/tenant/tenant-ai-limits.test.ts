import { describe, expect, it } from "vitest";

import { tenantConverter } from "./schema.latest.js";

describe("tenantConverter schema v3", () => {
  it("migrates v2 documents and preserves optional aiLimits on write", () => {
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

    const written = tenantConverter.write({
      ...migrated,
      aiLimits: {
        monthlyInputTokens: 1000,
        monthlyBudgetUsd: 12.5,
      },
    });

    expect(written._schemaVersion).toBe(3);
    expect(written.aiLimits).toEqual({
      monthlyInputTokens: 1000,
      monthlyBudgetUsd: 12.5,
    });
  });
});
