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
