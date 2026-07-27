import { describe, expect, it } from "vitest";
import {
  applyClassifyConfidenceGate,
  coerceNearDuplicateCreateChild,
  compactEntityRecord,
  sortRecordsById,
  stableJsonStringify,
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
