import { describe, expect, it } from "vitest";

import { buildQueryConfigFromDefinition } from "./build-query-config.js";
import { resolveTemporalPreset } from "./temporal.js";
import type { EntityQueryDefinitionRecord } from "./types.js";

describe("resolveTemporalPreset", () => {
  const fixedNow = new Date("2026-06-15T14:30:00.000Z");

  it("resolves startOfDay and today to UTC midnight", () => {
    expect(resolveTemporalPreset("startOfDay", fixedNow)).toBe(
      "2026-06-15T00:00:00.000Z",
    );
    expect(resolveTemporalPreset("today", fixedNow)).toBe(
      "2026-06-15T00:00:00.000Z",
    );
  });

  it("resolves endOfDay to UTC end of day", () => {
    expect(resolveTemporalPreset("endOfDay", fixedNow)).toBe(
      "2026-06-15T23:59:59.999Z",
    );
  });

  it("resolves month boundaries", () => {
    expect(resolveTemporalPreset("startOfMonth", fixedNow)).toBe(
      "2026-06-01T00:00:00.000Z",
    );
    expect(resolveTemporalPreset("endOfMonth", fixedNow)).toBe(
      "2026-06-30T23:59:59.999Z",
    );
  });

  it("resolves year boundaries", () => {
    expect(resolveTemporalPreset("startOfYear", fixedNow)).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(resolveTemporalPreset("endOfYear", fixedNow)).toBe(
      "2026-12-31T23:59:59.999Z",
    );
  });

  it("resolves ISO week boundaries (Monday start)", () => {
    const sunday = new Date("2026-07-05T12:00:00.000Z");
    expect(resolveTemporalPreset("startOfWeek", sunday)).toBe(
      "2026-06-29T00:00:00.000Z",
    );
    expect(resolveTemporalPreset("endOfWeek", sunday)).toBe(
      "2026-07-05T23:59:59.999Z",
    );

    expect(resolveTemporalPreset("startOfWeek", fixedNow)).toBe(
      "2026-06-15T00:00:00.000Z",
    );
    expect(resolveTemporalPreset("endOfWeek", fixedNow)).toBe(
      "2026-06-21T23:59:59.999Z",
    );
  });
});

describe("buildQueryConfigFromDefinition", () => {
  const baseDefinition: Pick<
    EntityQueryDefinitionRecord,
    "filter" | "sort" | "select" | "limitMode" | "limit"
  > = {
    filter: {
      type: "group",
      combinator: "and",
      children: [
        {
          type: "condition",
          field: "nextBillingDate",
          operator: ">=",
          value: { type: "temporal", preset: "today" },
        },
      ],
    },
    sort: [{ field: "nextBillingDate", direction: "asc" }],
    select: ["id", "nextBillingDate"],
    limitMode: "topN",
    limit: 50,
  };

  it("maps filter tree, sort, select, and pagination", () => {
    const fixedNow = new Date("2026-06-15T14:30:00.000Z");
    const config = buildQueryConfigFromDefinition(baseDefinition, {
      now: fixedNow,
    });

    expect(config.filter).toEqual({
      type: "group",
      combinator: "and",
      children: [
        {
          type: "condition",
          field: "nextBillingDate",
          operator: ">=",
          value: "2026-06-15T00:00:00.000Z",
        },
      ],
    });
    expect(config.sort).toEqual([
      { field: "nextBillingDate", direction: "asc" },
    ]);
    expect(config.select).toEqual(["id", "nextBillingDate"]);
    expect(config.pagination).toEqual({ limit: 50 });
  });

  it("omits pagination when limitMode is all", () => {
    const config = buildQueryConfigFromDefinition({
      ...baseDefinition,
      limitMode: "all",
      limit: undefined,
    });

    expect(config.pagination).toBeUndefined();
  });
});
