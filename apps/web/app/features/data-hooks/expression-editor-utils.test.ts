import { describe, expect, it } from "vitest";

import {
  createDefaultCallArgs,
  createDefaultNode,
  resolveEditorKind,
} from "./expression-editor-utils";

describe("resolveEditorKind", () => {
  it("maps simple and structured nodes", () => {
    expect(resolveEditorKind({ kind: "literal", value: 1 })).toBe("literal");
    expect(
      resolveEditorKind({
        kind: "field",
        source: "current",
        path: "amount",
      }),
    ).toBe("field");
    expect(resolveEditorKind({ kind: "var", name: "now" })).toBe("now");
    expect(resolveEditorKind({ kind: "var", name: "loopIndex" })).toBe(
      "loopIndex",
    );
    expect(
      resolveEditorKind({
        kind: "binary",
        op: "+",
        left: { kind: "literal", value: 1 },
        right: { kind: "literal", value: 2 },
      }),
    ).toBe("binary");
    expect(
      resolveEditorKind({
        kind: "unary",
        op: "-",
        operand: { kind: "literal", value: 1 },
      }),
    ).toBe("unary");
    expect(
      resolveEditorKind({
        kind: "call",
        fn: "concat",
        args: [{ kind: "literal", value: "a" }],
      }),
    ).toBe("call");
  });
});

describe("createDefaultNode", () => {
  it("seeds structured defaults", () => {
    expect(createDefaultNode("binary")).toEqual({
      kind: "binary",
      op: "+",
      left: { kind: "literal", value: 0 },
      right: { kind: "literal", value: 0 },
    });
    expect(createDefaultNode("call")).toEqual({
      kind: "call",
      fn: "concat",
      args: [{ kind: "literal", value: "" }],
    });
  });
});

describe("createDefaultCallArgs", () => {
  it("preserves variadic args and pads to minimum", () => {
    expect(createDefaultCallArgs("concat", [])).toEqual([
      { kind: "literal", value: "" },
    ]);
    expect(
      createDefaultCallArgs("concat", [
        { kind: "literal", value: "a" },
        { kind: "literal", value: "b" },
      ]),
    ).toEqual([
      { kind: "literal", value: "a" },
      { kind: "literal", value: "b" },
    ]);
  });

  it("seeds date unit for dateAdd", () => {
    expect(createDefaultCallArgs("dateAdd", [])).toEqual([
      { kind: "literal", value: "" },
      { kind: "literal", value: "" },
      { kind: "literal", value: "DAY" },
    ]);
  });
});
