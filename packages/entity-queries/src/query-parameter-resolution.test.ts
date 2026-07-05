import { describe, expect, it } from "vitest";

import {
  resolveDateBucketParameterBound,
  resolveQueryParameterFilterValue,
} from "./query-parameter-resolution.js";
import type { EntityQueryParameter } from "./types.js";

describe("resolveDateBucketParameterBound", () => {
  it("returns ISO start/end for month bucket", () => {
    expect(resolveDateBucketParameterBound("2026-06", "month", "start")).toBe(
      "2026-06-01T00:00:00.000Z",
    );
    expect(resolveDateBucketParameterBound("2026-06", "month", "end")).toBe(
      "2026-06-30T23:59:59.999Z",
    );
  });
});

describe("resolveQueryParameterFilterValue", () => {
  const parameters: readonly EntityQueryParameter[] = [
    {
      name: "period",
      valueType: "dateBucket",
      granularity: "month",
      field: "date",
    },
  ];

  it("resolves parameter start bound from values map", () => {
    expect(
      resolveQueryParameterFilterValue(
        { type: "parameter", name: "period", bound: "start" },
        parameters,
        { period: "2026-06" },
      ),
    ).toBe("2026-06-01T00:00:00.000Z");
  });
});
