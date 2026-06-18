import { describe, expect, it } from "vitest";

import { componentRowSchema } from "./ui-layout-schema.js";
import type { ComponentRowNode } from "../types/layout.js";

describe("componentRowSchema image overlay", () => {
  it("parses image overlay component rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-chart",
      component: {
        kind: "image",
        primary: { type: "static", value: "https://example.com/chart.png" },
        displayMode: "overlay",
        objectFit: "cover",
      },
    }) as ComponentRowNode;

    expect(parsed.component).toEqual({
      kind: "image",
      primary: { type: "static", value: "https://example.com/chart.png" },
      displayMode: "overlay",
      objectFit: "cover",
    });
  });
});
