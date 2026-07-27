import { describe, expect, it } from "vitest";

import { componentRowSchema } from "./ui-layout-schema.js";
import type { ComponentRowNode } from "../types/layout.js";

describe("componentRowSchema ai-chat", () => {
  it("parses ai-chat component rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-1",
      component: {
        kind: "ai-chat",
        iconName: "MessageSquare",
        iconSize: 24,
        busyIndicator: true,
      },
    }) as ComponentRowNode;

    expect(parsed.component).toMatchObject({
      kind: "ai-chat",
      iconName: "MessageSquare",
      iconSize: 24,
      busyIndicator: true,
    });
  });
});
