import { describe, expect, it } from "vitest";
import {
  applyClassifyConfidenceGate,
  coerceNearDuplicateCreateChild,
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
