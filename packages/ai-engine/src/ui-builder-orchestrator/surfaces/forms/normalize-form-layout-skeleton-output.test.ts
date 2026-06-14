import { describe, expect, it } from "vitest";

import { layoutSkeletonOutputSchema } from "./forms-steps.js";
import { coerceFormLayoutSkeletonOutput } from "./normalize-form-layout-skeleton-output.js";

describe("coerceFormLayoutSkeletonOutput", () => {
  it("accepts wizard shell components without fieldPath", () => {
    const coerced = coerceFormLayoutSkeletonOutput({
      components: [
        { kind: "wizard-progress" },
        { kind: "wizard-step-host" },
        { kind: "wizard-actions" },
      ],
    });

    const parsed = layoutSkeletonOutputSchema.safeParse(coerced);
    expect(parsed.success).toBe(true);
    expect(coerced.components).toHaveLength(3);
    expect(coerced.components.map((component) => component.kind)).toEqual([
      "wizard-progress",
      "wizard-step-host",
      "wizard-actions",
    ]);
  });

  it("accepts form-actions without fieldPath", () => {
    const coerced = coerceFormLayoutSkeletonOutput({
      components: [{ kind: "form-actions" }],
    });

    expect(layoutSkeletonOutputSchema.safeParse(coerced).success).toBe(true);
  });

  it("still requires fieldPath for form-field skeleton items", () => {
    const coerced = coerceFormLayoutSkeletonOutput({
      components: [{ kind: "form-field" }],
    });

    expect(coerced.components).toHaveLength(0);
  });
});
