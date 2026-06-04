import { describe, expect, it } from "vitest";

import type { MetricDefinitionRecord } from "../lib/api-client.js";
import { entityHasActiveMetrics } from "./entity-metrics-nav.js";

describe("entityHasActiveMetrics", () => {
  const definitions: readonly MetricDefinitionRecord[] = [
    {
      id: "m1",
      name: "Total",
      status: "ACTIVE",
      sourceModel: "account",
    } as MetricDefinitionRecord,
    {
      id: "m2",
      name: "Other",
      status: "ACTIVE",
      sourceModel: "contact",
    } as MetricDefinitionRecord,
  ];

  it("is true when an active definition matches source model", () => {
    expect(entityHasActiveMetrics("account", definitions)).toBe(true);
    expect(entityHasActiveMetrics("deal", definitions)).toBe(false);
  });

  it("is true when table view already has a configured metrics strip", () => {
    expect(entityHasActiveMetrics("deal", definitions, true)).toBe(true);
  });
});
