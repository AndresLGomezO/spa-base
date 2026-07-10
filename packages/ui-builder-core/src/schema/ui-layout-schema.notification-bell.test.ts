import { describe, expect, it } from "vitest";

import { componentRowSchema } from "./ui-layout-schema.js";
import type { ComponentRowNode } from "../types/layout.js";

describe("componentRowSchema notification-bell", () => {
  it("parses notification-bell component rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-1",
      component: {
        kind: "notification-bell",
        iconName: "BellRing",
        iconSize: 24,
        showBadge: true,
      },
    }) as ComponentRowNode;

    expect(parsed.component).toMatchObject({
      kind: "notification-bell",
      iconName: "BellRing",
      iconSize: 24,
      showBadge: true,
    });
  });
});
