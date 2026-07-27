import { describe, expect, it } from "vitest";
import {
  applyClassifyConfidenceGate,
  buildCompactCategoryCatalog,
  coerceNearDuplicateCreateChild,
  compactEntityRecord,
  filterCategoriesForHint,
  sortRecordsById,
  stableJsonStringify,
  translateShortCategoryId,
} from "./call-data-hook-ai.js";

describe("applyClassifyConfidenceGate", () => {
  it("keeps high-confidence useExisting results", () => {
    const input = {
      action: "useExisting",
      categoryId: "cat_food",
      confidence: 0.97,
    };
    expect(applyClassifyConfidenceGate(input)).toEqual(input);
  });

  it("abstains when confidence is below 0.95", () => {
    expect(
      applyClassifyConfidenceGate({
        action: "useExisting",
        categoryId: "cat_groceries",
        parentCategoryId: null,
        newCategoryName: null,
        confidence: 0.8,
      }),
    ).toEqual({
      action: "abstain",
      categoryId: null,
      parentCategoryId: null,
      newCategoryName: null,
      confidence: 0.8,
    });
  });

  it("abstains when confidence is missing", () => {
    expect(
      applyClassifyConfidenceGate({
        action: "useExisting",
        categoryId: "cat_food",
      }),
    ).toMatchObject({
      action: "abstain",
      categoryId: null,
      confidence: 0,
    });
  });
});

describe("coerceNearDuplicateCreateChild", () => {
  it("maps near-duplicate createChild to useExisting", () => {
    expect(
      coerceNearDuplicateCreateChild(
        {
          action: "createChild",
          newCategoryName: "Italian Food",
          parentCategoryId: "root_expenses",
          confidence: 0.99,
        },
        [{ id: "cat_food", name: "Food", parentId: "root_expenses" }],
      ),
    ).toEqual({
      action: "useExisting",
      categoryId: "cat_food",
      newCategoryName: null,
      parentCategoryId: null,
      confidence: 0.99,
    });
  });
});

describe("stable includeEntities catalog prefix", () => {
  it("emits identical JSON for shuffled input with fixed key order", () => {
    const a = compactEntityRecord({
      id: "b-id",
      kind: "EXPENSE",
      name: "Food",
      parentId: "root",
      description: "meals",
    });
    const b = compactEntityRecord({
      description: "meals",
      parentId: "root",
      name: "Food",
      kind: "EXPENSE",
      id: "b-id",
    });
    expect(stableJsonStringify([a])).toBe(stableJsonStringify([b]));
    expect(stableJsonStringify([a])).toBe(
      '[{"id":"b-id","name":"Food","parentId":"root","kind":"EXPENSE","description":"meals"}]',
    );
  });

  it("sorts records by id so catalog order is deterministic", () => {
    const shuffled = [
      { id: "z", name: "Z" },
      { id: "a", name: "A" },
      { id: "m", name: "M" },
    ];
    expect(sortRecordsById(shuffled).map((row) => row.id)).toEqual([
      "a",
      "m",
      "z",
    ]);
    expect(
      stableJsonStringify(
        sortRecordsById(shuffled).map((row) =>
          compactEntityRecord(row as Record<string, unknown>),
        ),
      ),
    ).toBe(
      stableJsonStringify(
        sortRecordsById([...shuffled].reverse()).map((row) =>
          compactEntityRecord(row as Record<string, unknown>),
        ),
      ),
    );
  });
});

describe("buildCompactCategoryCatalog", () => {
  const catalog = [
    {
      id: "aaa-food",
      name: "Food",
      parentId: "zzz-expenses",
      kind: "EXPENSE",
    },
    {
      id: "bbb-transport",
      name: "Transport",
      parentId: "zzz-expenses",
      kind: "EXPENSE",
    },
    { id: "zzz-expenses", name: "Expenses", kind: "EXPENSE" },
    {
      id: "mmm-salary",
      name: "Salary",
      parentId: "nnn-income",
      kind: "INCOME",
    },
    { id: "nnn-income", name: "Income", kind: "INCOME" },
  ];

  it("assigns stable short ids and emits grouped text", () => {
    const { text, shortToLong } = buildCompactCategoryCatalog(catalog);
    expect([...shortToLong.entries()]).toEqual([
      ["c1", "aaa-food"],
      ["c2", "bbb-transport"],
      ["c3", "mmm-salary"],
      ["c4", "nnn-income"],
      ["c5", "zzz-expenses"],
    ]);
    expect(text).toContain(
      "Categories (short → real id maps server-side; return short id):",
    );
    expect(text).toContain("EXPENSE");
    expect(text).toContain("- c1: Food (parent: c5 Expenses)");
    expect(text).toContain("- c2: Transport (parent: c5 Expenses)");
    expect(text).toContain("INCOME");
    expect(text).toContain("- c3: Salary (parent: c4 Income)");
    expect(buildCompactCategoryCatalog([...catalog].reverse()).text).toBe(text);
  });
});

describe("translateShortCategoryId", () => {
  it("maps short ids to real uuids and passes unknowns through", () => {
    const map = new Map([["c1", "aaa-food"]]);
    expect(
      translateShortCategoryId({ action: "useExisting", categoryId: "c1" }, map),
    ).toEqual({ action: "useExisting", categoryId: "aaa-food" });
    expect(
      translateShortCategoryId(
        { action: "useExisting", categoryId: "unknown" },
        map,
      ),
    ).toEqual({ action: "useExisting", categoryId: "unknown" });
    expect(
      translateShortCategoryId({ action: "abstain", categoryId: null }, map),
    ).toEqual({ action: "abstain", categoryId: null });
  });
});

describe("filterCategoriesForHint", () => {
  const catalog = [
    { id: "root-exp", name: "Expenses", kind: "EXPENSE" },
    {
      id: "leaf-transport",
      name: "Transport",
      parentId: "root-exp",
      kind: "EXPENSE",
    },
    {
      id: "leaf-food",
      name: "Food",
      parentId: "root-exp",
      kind: "EXPENSE",
    },
    {
      id: "leaf-rentals",
      name: "Rentals",
      parentId: "root-exp",
      kind: "EXPENSE",
    },
  ];

  it("keeps matching leaves and all parents for a positive hint", () => {
    const filtered = filterCategoriesForHint(catalog, "UBER RIDES TRANSPORT");
    expect(filtered.map((row) => row.id)).toEqual([
      "leaf-transport",
      "root-exp",
    ]);
  });

  it("scores flat catalogs (no parentId) directly", () => {
    const flat = [
      { id: "cat_food", name: "Food", kind: "EXPENSE" },
      { id: "cat_transport", name: "Transport", kind: "EXPENSE" },
      { id: "cat_rentals", name: "Rentals", kind: "EXPENSE" },
    ];
    expect(
      filterCategoriesForHint(flat, "UBER TRANSPORT").map((row) => row.id),
    ).toEqual(["cat_transport"]);
  });

  it("returns the full catalog when the hint has no signal", () => {
    expect(filterCategoriesForHint(catalog, "XYZNOMATCH").map((r) => r.id)).toEqual(
      catalog.map((r) => r.id),
    );
    expect(filterCategoriesForHint(catalog, undefined)).toEqual(catalog);
    expect(filterCategoriesForHint(catalog, "   ")).toEqual(catalog);
  });
});
