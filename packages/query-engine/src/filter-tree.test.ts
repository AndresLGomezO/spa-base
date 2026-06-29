import { describe, expect, it } from "vitest";

import {
  applyPostFilterTree,
  evaluateFilterTree,
  enforceFirestoreConstraintsOnTree,
  partitionFilterTree,
} from "./filter-tree.js";
import type { NormalizedFilterNode } from "@repo/firestore-converters/filter-tree";

const record = {
  id: "1",
  status: "ACTIVE",
  title: "Hello world",
  amount: 42,
};

function cond(
  field: string,
  operator: string,
  value: unknown,
): NormalizedFilterNode {
  return {
    type: "condition",
    field,
    operator: operator as never,
    value,
  };
}

function and(children: NormalizedFilterNode[]): NormalizedFilterNode {
  return { type: "group", combinator: "and", children };
}

function or(children: NormalizedFilterNode[]): NormalizedFilterNode {
  return { type: "group", combinator: "or", children };
}

describe("evaluateFilterTree", () => {
  it("evaluates AND groups", () => {
    const tree = and([
      cond("status", "==", "ACTIVE"),
      cond("amount", ">=", 40),
    ]);
    expect(evaluateFilterTree(record, tree)).toBe(true);
    expect(
      evaluateFilterTree(record, and([cond("status", "==", "INACTIVE")])),
    ).toBe(false);
  });

  it("evaluates OR groups", () => {
    const tree = or([
      cond("status", "==", "INACTIVE"),
      cond("amount", "==", 42),
    ]);
    expect(evaluateFilterTree(record, tree)).toBe(true);
    expect(
      evaluateFilterTree(
        record,
        or([cond("status", "==", "INACTIVE"), cond("amount", "==", 0)]),
      ),
    ).toBe(false);
  });

  it("evaluates nested AND/OR", () => {
    const tree = and([
      cond("status", "==", "ACTIVE"),
      or([cond("title", "==", "missing"), cond("amount", "==", 42)]),
    ]);
    expect(evaluateFilterTree(record, tree)).toBe(true);
  });
});

describe("partitionFilterTree", () => {
  it("splits post-filter operators into postFilterTree", () => {
    const tree = and([
      cond("title", "contains", "Hello"),
      cond("status", "==", "ACTIVE"),
    ]);
    const { nativeTree, postFilterTree } = partitionFilterTree(tree);
    expect(nativeTree).not.toBeNull();
    expect(postFilterTree).not.toBeNull();
    if (nativeTree?.type === "group") {
      expect(nativeTree.children).toHaveLength(1);
      expect(nativeTree.children[0]?.type).toBe("condition");
    }
  });
});

describe("applyPostFilterTree", () => {
  it("filters items using post-filter subtree", () => {
    const tree = cond("title", "contains", "world");
    const items = [record, { ...record, id: "2", title: "Other" }];
    const filtered = applyPostFilterTree(items, tree);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("1");
  });
});

describe("enforceFirestoreConstraintsOnTree", () => {
  it("rejects multiple inequality fields in one AND branch", () => {
    const tree = and([cond("amount", ">", 10), cond("amount", "<", 100)]);
    expect(() => enforceFirestoreConstraintsOnTree(tree, null)).toThrow();
  });
});
