import { describe, expect, it } from "vitest";

import {
  createEmptyEntityQueryFilterCondition,
  createEmptyEntityQueryFilterRoot,
  editorRootToEntityQueryFilter,
  updateEditorNode,
} from "./entity-query-filter-utils";

describe("updateEditorNode", () => {
  it("updates the root group combinator", () => {
    const root = createEmptyEntityQueryFilterRoot();
    expect(root.combinator).toBe("and");

    const updated = updateEditorNode(root, root.id, { combinator: "or" });
    expect(updated.combinator).toBe("or");
  });

  it("updates nested group combinator", () => {
    const root = createEmptyEntityQueryFilterRoot();
    const nested = {
      id: "nested-group",
      type: "group" as const,
      combinator: "and" as const,
      children: [],
    };
    const withNested = updateEditorNode(root, root.id, {
      children: [nested],
    });

    const updated = updateEditorNode(withNested, nested.id, {
      combinator: "or",
    });
    expect(updated.children[0]?.type).toBe("group");
    if (updated.children[0]?.type === "group") {
      expect(updated.children[0].combinator).toBe("or");
    }
  });
});

describe("editorRootToEntityQueryFilter", () => {
  it("preserves root combinator when there are no conditions", () => {
    const root = createEmptyEntityQueryFilterRoot();
    const withOr = updateEditorNode(root, root.id, { combinator: "or" });
    expect(editorRootToEntityQueryFilter(withOr)).toEqual({
      type: "group",
      combinator: "or",
      children: [],
    });
  });

  it("preserves root combinator with conditions", () => {
    const root = createEmptyEntityQueryFilterRoot();
    const condition = createEmptyEntityQueryFilterCondition();
    const withCondition = updateEditorNode(root, root.id, {
      combinator: "or",
      children: [{ ...condition, field: "status", scalarValue: "ACTIVE" }],
    });

    expect(editorRootToEntityQueryFilter(withCondition)).toMatchObject({
      type: "group",
      combinator: "or",
    });
  });
});
