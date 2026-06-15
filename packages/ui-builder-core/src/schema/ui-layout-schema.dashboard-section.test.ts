import { describe, expect, it } from "vitest";

import { componentRowSchema } from "./ui-layout-schema.js";
import type { ComponentRowNode } from "../types/layout.js";

describe("componentRowSchema dashboard-section", () => {
  it("parses dashboard-section component rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-1",
      component: {
        kind: "dashboard-section",
        sectionId: "section-1",
        label: "Overview",
      },
    }) as ComponentRowNode;

    expect(parsed.component).toMatchObject({
      kind: "dashboard-section",
      sectionId: "section-1",
    });
  });
});
