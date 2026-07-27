import { describe, expect, it } from "vitest";

import {
  aliasesFromFieldValue,
  pickBestAliasMatch,
} from "./match-related-record-utils.js";

const CHILDREN = [
  {
    id: "netflix",
    name: "Netflix",
    billingAliases: ["NETFLIX"],
  },
  {
    id: "icloud",
    name: "Apple iCloud",
    billingAliases: ["APPLE.COM/BILL"],
  },
  {
    id: "google",
    name: "Google One",
    billingAliases: ["GOOGLE *GOOGLE ONE", "GOOGLE*GOOGLE ONE"],
  },
] as const;

describe("pickBestAliasMatch", () => {
  it("matches exact aliases case-insensitively", () => {
    expect(
      pickBestAliasMatch({
        haystack: "netflix",
        aliasField: "billingAliases",
        candidates: CHILDREN,
      })?.id,
    ).toBe("netflix");
  });

  it("picks the longest substring alias", () => {
    expect(
      pickBestAliasMatch({
        haystack: "PURCHASE GOOGLE *GOOGLE ONE STORE",
        aliasField: "billingAliases",
        candidates: CHILDREN,
      })?.id,
    ).toBe("google");
  });

  it("returns null for empty haystack", () => {
    expect(
      pickBestAliasMatch({
        haystack: "   ",
        aliasField: "billingAliases",
        candidates: CHILDREN,
      }),
    ).toBeNull();
  });

  it("supports a string alias field", () => {
    expect(
      pickBestAliasMatch({
        haystack: "ACME CORP INVOICE",
        aliasField: "code",
        candidates: [
          { id: "a", code: "ACME" },
          { id: "b", code: "OTHER" },
        ],
      })?.id,
    ).toBe("a");
  });

  it("skips candidates with empty aliases", () => {
    expect(
      pickBestAliasMatch({
        haystack: "HELLO",
        aliasField: "billingAliases",
        candidates: [{ id: "empty", billingAliases: [] }],
      }),
    ).toBeNull();
  });

  it("matches Uber shapes with token-order variance via merchant overlap", () => {
    // PENDING haystack already merchant-normalized: "UBER *TRIP 987 ES" → "UBER TRIP ES"
    // DONE description: "UBER *ES-TRIP 12" → aliases include "UBER ES TRIP"
    // Exact/substring miss; leading-token overlap must hit.
    expect(
      pickBestAliasMatch({
        haystack: "UBER TRIP ES",
        aliasField: "description",
        candidates: [
          {
            id: "uber_done",
            description: "UBER *ES-TRIP 12",
            categoryId: "cat_transport",
          },
          {
            id: "spotify",
            description: "SPOTIFY PREMIUM",
            categoryId: "cat_music",
          },
        ],
      })?.id,
    ).toBe("uber_done");
  });

  it("matches when the haystack is a shorter Uber token set than the alias", () => {
    expect(
      pickBestAliasMatch({
        haystack: "UBER TRIP",
        aliasField: "description",
        candidates: [
          {
            id: "uber_long",
            description: "UBER *TRIP HELP ABCDEF123456 12.50 COP",
            categoryId: "cat_transport",
          },
        ],
      })?.id,
    ).toBe("uber_long");
  });

  it("does not match unrelated merchants that share only filler tokens", () => {
    expect(
      pickBestAliasMatch({
        haystack: "UBER TRIP HELP COP",
        aliasField: "description",
        candidates: [
          {
            id: "rappi",
            description: "RAPPI HELP COP",
            categoryId: "cat_food",
          },
        ],
      }),
    ).toBeNull();
  });
});

describe("aliasesFromFieldValue", () => {
  it("normalizes string and array inputs", () => {
    expect(aliasesFromFieldValue("  Foo ")).toEqual(["FOO"]);
    expect(aliasesFromFieldValue(["a", "  b ", ""])).toEqual(["A", "B"]);
    expect(aliasesFromFieldValue(null)).toEqual([]);
  });

  it("adds merchant-normalized form for free-text descriptions", () => {
    const aliases = aliasesFromFieldValue("UBER *TRIP 12345 HELP");
    expect(aliases.length).toBeGreaterThan(1);
    expect(
      pickBestAliasMatch({
        haystack: aliases.find((alias) => !/\d/.test(alias)) ?? "",
        aliasField: "description",
        candidates: [
          {
            id: "t1",
            description: "UBER *TRIP 99999 HELP",
          },
        ],
      })?.id,
    ).toBe("t1");
  });
});
