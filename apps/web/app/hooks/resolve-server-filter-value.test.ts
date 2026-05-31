import { describe, expect, it } from "vitest";

import {
  parseDisplayDateFilterValue,
  resolveServerFilterValue,
} from "./resolve-server-filter-value";

describe("resolveServerFilterValue", () => {
  it("parses legacy display date filter values to ISO", () => {
    expect(parseDisplayDateFilterValue("2026-05-31 11:23 PM GMT+0")).toBe(
      "2026-05-31T23:23:00.000Z",
    );
  });

  it("coerces date, number, and boolean filter values for the query engine", () => {
    expect(resolveServerFilterValue("date", "2026-05-31 11:23 PM GMT+0")).toBe(
      "2026-05-31T23:23:00.000Z",
    );
    expect(resolveServerFilterValue("date", "2026-05-31T23:23:00.000Z")).toBe(
      "2026-05-31T23:23:00.000Z",
    );
    expect(resolveServerFilterValue("number", "42")).toBe(42);
    expect(resolveServerFilterValue("boolean", "true")).toBe(true);
  });
});
