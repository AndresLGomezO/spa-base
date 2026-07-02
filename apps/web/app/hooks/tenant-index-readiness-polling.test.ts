import { describe, expect, it } from "vitest";

import { pollIntervalForTenantIndexReadiness } from "./tenant-index-readiness-polling";

describe("pollIntervalForTenantIndexReadiness", () => {
  it("polls every 5s while building or creating", () => {
    expect(pollIntervalForTenantIndexReadiness("building", 0, 0)).toBe(5_000);
    expect(pollIntervalForTenantIndexReadiness("ready", 2, 0)).toBe(5_000);
  });

  it("polls every 15s while errors remain", () => {
    expect(pollIntervalForTenantIndexReadiness("error", 0, 1)).toBe(15_000);
    expect(pollIntervalForTenantIndexReadiness("ready", 0, 1)).toBe(15_000);
  });

  it("stops polling when idle and healthy", () => {
    expect(pollIntervalForTenantIndexReadiness("ready", 0, 0)).toBe(false);
    expect(pollIntervalForTenantIndexReadiness("idle", 0, 0)).toBe(false);
  });
});
