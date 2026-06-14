import { describe, expect, it } from "vitest";
import { createDefaultFormLayout } from "@repo/ui-builder-core";

import type { FormsSliceData } from "@repo/entities";

import { mergeFormsSliceForApply } from "./merge-forms-slice-for-apply.js";

describe("mergeFormsSliceForApply", () => {
  it("merges plain branch and preserves wizard from current", () => {
    const current: FormsSliceData = {
      presentation: "wizard",
      wizard: {
        shellLayout: createDefaultFormLayout([]),
        steps: [
          {
            id: "step-1",
            label: "Old",
            layout: createDefaultFormLayout(["name"]),
          },
        ],
      },
    };
    const incoming: FormsSliceData = {
      presentation: "plain",
      layout: createDefaultFormLayout(["name", "email"]),
    };

    const merged = mergeFormsSliceForApply(current, incoming);
    expect(merged.presentation).toBe("plain");
    expect(merged.layout).toEqual(incoming.layout);
    expect(merged.wizard).toEqual(current.wizard);
  });

  it("merges wizard branch and preserves plain layout from current", () => {
    const current: FormsSliceData = {
      presentation: "plain",
      layout: createDefaultFormLayout(["name"]),
    };
    const incoming: FormsSliceData = {
      presentation: "wizard",
      wizard: {
        shellLayout: createDefaultFormLayout([]),
        steps: [
          {
            id: "step-1",
            label: "Details",
            layout: createDefaultFormLayout(["email"]),
          },
        ],
      },
    };

    const merged = mergeFormsSliceForApply(current, incoming);
    expect(merged.presentation).toBe("wizard");
    expect(merged.wizard).toEqual(incoming.wizard);
    expect(merged.layout).toEqual(current.layout);
  });
});
