import { describe, expect, it } from "vitest";

import { tenantAppearanceSchema } from "./tenant-appearance.js";

describe("tenantAppearanceSchema", () => {
  it("maps legacy instagram preset to soft", () => {
    const parsed = tenantAppearanceSchema.parse({
      preset: "instagram",
    });

    expect(parsed.preset).toBe("soft");
  });

  it("strips removed glass-glow preset ids on read", () => {
    for (const preset of [
      "sophisticated-glass-glow",
      "sophisticated-glass-glow-v2",
    ] as const) {
      const parsed = tenantAppearanceSchema.parse({
        preset,
        effects: {
          backdropFilterCard: { dark: "blur(20px) saturate(180%)" },
        },
      });

      expect(parsed.preset).toBeUndefined();
      expect(parsed.effects?.backdropFilterCard?.dark).toBe(
        "blur(20px) saturate(180%)",
      );
    }
  });
});
