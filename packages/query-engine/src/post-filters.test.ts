import { describe, expect, it } from "vitest";

import {
  applyPostFilters,
  buildNormalizedDocumentSearchText,
  normalizeValueForDocumentSearch,
} from "./post-filters.js";

describe("buildNormalizedDocumentSearchText", () => {
  it("concatenates normalized values from all record properties", () => {
    expect(
      buildNormalizedDocumentSearchText({
        code: "AB",
        label: "CD",
        count: 12,
        active: true,
      }),
    ).toBe("abcd12true");
  });

  it("skips search mirror storage keys", () => {
    expect(
      buildNormalizedDocumentSearchText({
        name: "Acme",
        nameSearchTokens: ["acme"],
        nameSearch: "acme",
      }),
    ).toBe("acme");
  });

  it("excludes configured fields", () => {
    expect(
      buildNormalizedDocumentSearchText(
        { public: "visible", secret: "hidden" },
        { excludeFields: ["secret"] },
      ),
    ).toBe("visible");
  });
});

describe("applyPostFilters sourceFieldsContain", () => {
  const documentFilter = {
    field: "__searchSourceFields__",
    operator: "sourceFieldsContain" as const,
    value: { term: "1234" },
  };

  it("matches substring across field boundaries in the haystack", () => {
    const result = applyPostFilters(
      [{ code: "12", label: "34", id: "x", tenantId: "t" }],
      [documentFilter],
    );
    expect(result).toHaveLength(1);
  });

  it("matches values from non-string fields", () => {
    const result = applyPostFilters(
      [{ sku: "A", quantity: 42 }],
      [{ ...documentFilter, value: { term: "a42" } }],
    );
    expect(result).toHaveLength(1);
  });

  it("still supports explicit field list mode", () => {
    const result = applyPostFilters(
      [{ code: "12", label: "34" }],
      [
        {
          field: "__searchSourceFields__",
          operator: "sourceFieldsContain",
          value: { term: "1234", fields: ["code", "label"] },
        },
      ],
    );
    expect(result).toHaveLength(1);
  });
});

describe("normalizeValueForDocumentSearch", () => {
  it("lowercases and trims strings", () => {
    expect(normalizeValueForDocumentSearch("  Hello ")).toBe("hello");
  });
});
