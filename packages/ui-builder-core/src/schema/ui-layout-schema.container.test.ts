import { describe, expect, it } from "vitest";

import { componentRowSchema } from "./ui-layout-schema.js";
import type { ComponentRowNode } from "../types/layout.js";

describe("componentRowSchema container", () => {
  it("parses container component rows with stack direction", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-1",
      component: {
        kind: "container",
        stackDirection: "row",
        rows: [],
      },
    }) as ComponentRowNode;

    expect(parsed.component).toMatchObject({
      kind: "container",
      stackDirection: "row",
      rows: [],
    });
  });
});
