import { describe, expect, it } from "vitest";

import {
  buildDefaultEntityQueryParameterValues,
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

  it("returns month-to-date end for current month", () => {
    const now = new Date(Date.UTC(2026, 6, 15, 12, 0, 0));
    expect(
      resolveDateBucketParameterBound("2026-07", "month", "endToDate", now),
    ).toBe("2026-07-15T23:59:59.999Z");
  });

  it("returns full month end for historical month endToDate", () => {
    const now = new Date(Date.UTC(2026, 6, 15, 12, 0, 0));
    expect(
      resolveDateBucketParameterBound("2026-06", "month", "endToDate", now),
    ).toBe("2026-06-30T23:59:59.999Z");
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

  it("resolves endToDate bound from values map", () => {
    const now = new Date(Date.UTC(2026, 6, 15, 12, 0, 0));
    expect(
      resolveQueryParameterFilterValue(
        { type: "parameter", name: "period", bound: "endToDate" },
        parameters,
        { period: "2026-07" },
        { now },
      ),
    ).toBe("2026-07-15T23:59:59.999Z");
  });

  it("applies offset before resolving date bucket bound", () => {
    expect(
      resolveQueryParameterFilterValue(
        {
          type: "parameter",
          name: "period",
          bound: "start",
          offset: -11,
          unit: "month",
        },
        parameters,
        { period: "2026-06" },
      ),
    ).toBe("2025-07-01T00:00:00.000Z");
  });

  it("resolves stringList parameter values for in filters", () => {
    const stringListParameters: readonly EntityQueryParameter[] = [
      {
        name: "types",
        valueType: "stringList",
        field: "type",
      },
    ];

    expect(
      resolveQueryParameterFilterValue(
        { type: "parameter", name: "types" },
        stringListParameters,
        { types: ["INCOME", "EXPENSE"] },
      ),
    ).toEqual(["INCOME", "EXPENSE"]);
  });
});

describe("buildDefaultEntityQueryParameterValues", () => {
  it("defaults dateBucket parameters to the current bucket", () => {
    const now = new Date(Date.UTC(2026, 6, 15, 12, 0, 0));

    expect(
      buildDefaultEntityQueryParameterValues(
        [
          {
            name: "period",
            valueType: "dateBucket",
            granularity: "month",
            field: "nextDueDate",
          },
        ],
        { now },
      ),
    ).toEqual({ period: "2026-07" });
  });
});
