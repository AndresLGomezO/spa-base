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

  it("matches shapes with token-order variance via leading-token overlap", () => {
    // Haystack already match-normalized: "ACME *ORDER 987 ES" → "ACME ORDER ES"
    // Candidate: "ACME *ES-ORDER 12" → aliases include "ACME ES ORDER"
    // Exact/substring miss; leading-token overlap must hit.
    expect(
      pickBestAliasMatch({
        haystack: "ACME ORDER ES",
        aliasField: "description",
        candidates: [
          {
            id: "acme_done",
            description: "ACME *ES-ORDER 12",
            categoryId: "cat_ops",
          },
          {
            id: "other",
            description: "OTHER PREMIUM",
            categoryId: "cat_other",
          },
        ],
      })?.id,
    ).toBe("acme_done");
  });

  it("matches when the haystack is a shorter token set than the alias", () => {
    expect(
      pickBestAliasMatch({
        haystack: "ACME ORDER",
        aliasField: "description",
        candidates: [
          {
            id: "acme_long",
            description: "ACME *ORDER HELP ABCDEF123456 12.50 XYZ",
            categoryId: "cat_ops",
          },
        ],
      })?.id,
    ).toBe("acme_long");
  });

  it("does not match unrelated leading tokens that share only filler", () => {
    expect(
      pickBestAliasMatch({
        haystack: "ACME ORDER HELP XYZ",
        aliasField: "description",
        candidates: [
          {
            id: "other",
            description: "BETA HELP XYZ",
            categoryId: "cat_other",
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

  it("adds match-normalized form for free-text descriptions", () => {
    const aliases = aliasesFromFieldValue("ACME *ORDER 12345 HELP");
    expect(aliases.length).toBeGreaterThan(1);
    expect(
      pickBestAliasMatch({
        haystack: aliases.find((alias) => !/\d/.test(alias)) ?? "",
        aliasField: "description",
        candidates: [
          {
            id: "t1",
            description: "ACME *ORDER 99999 HELP",
          },
        ],
      })?.id,
    ).toBe("t1");
  });
});
