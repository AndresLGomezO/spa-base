import { describe, expect, it } from "vitest";

import {
  canReadMetricDefinition,
  canReadMetricValues,
} from "./metric-access.js";

describe("canReadMetricValues", () => {
  it("allows metricValue.read", () => {
    expect(canReadMetricValues("transaction", ["metricValue.read"])).toBe(true);
  });

  it("allows source entity read without metricValue.read", () => {
    expect(canReadMetricValues("transaction", ["transaction.read"])).toBe(true);
  });

  it("denies when neither metric nor entity read is granted", () => {
    expect(canReadMetricValues("transaction", ["account.read"])).toBe(false);
  });
});

describe("canReadMetricDefinition", () => {
  it("allows metricDefinition.read", () => {
    expect(
      canReadMetricDefinition("transaction", ["metricDefinition.read"]),
    ).toBe(true);
  });

  it("allows transaction.read for runtime display", () => {
    expect(canReadMetricDefinition("transaction", ["transaction.read"])).toBe(
      true,
    );
  });
});
