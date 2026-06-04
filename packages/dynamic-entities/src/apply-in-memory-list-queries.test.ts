import { describe, expect, it } from "vitest";

import { applyInMemoryListQueries } from "./apply-in-memory-list-queries.js";

describe("applyInMemoryListQueries", () => {
  it("sets inMemoryListQueries when enabled", () => {
    expect(applyInMemoryListQueries({ label: "Tag" }, true)).toEqual({
      label: "Tag",
      inMemoryListQueries: true,
    });
  });

  it("removes inMemoryListQueries when disabled", () => {
    expect(
      applyInMemoryListQueries(
        { label: "Tag", inMemoryListQueries: true },
        false,
      ),
    ).toEqual({ label: "Tag" });
  });

  it("leaves record unchanged when undefined", () => {
    expect(
      applyInMemoryListQueries(
        { label: "Tag", inMemoryListQueries: true },
        undefined,
      ),
    ).toEqual({ label: "Tag", inMemoryListQueries: true });
  });
});
