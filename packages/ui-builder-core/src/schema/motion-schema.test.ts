import { describe, expect, it } from "vitest";

import { motionPresetSchema } from "./motion-schema.js";

describe("motionPresetSchema press fields", () => {
  it("accepts press effect configuration", () => {
    const parsed = motionPresetSchema.parse({
      press: "ripple",
      pressColor: "foreground",
      pressDurationMs: 600,
      pressOpacity: 0.35,
      pressScale: 1.2,
      pressGlowBlurPx: 24,
    });

    expect(parsed.press).toBe("ripple");
    expect(parsed.pressColor).toBe("foreground");
    expect(parsed.pressDurationMs).toBe(600);
    expect(parsed.pressOpacity).toBe(0.35);
  });

  it("rejects out-of-range pressDurationMs and pressOpacity", () => {
    expect(() =>
      motionPresetSchema.parse({ press: "glow", pressDurationMs: 5000 }),
    ).toThrow();

    expect(() =>
      motionPresetSchema.parse({ press: "wave", pressOpacity: 1.5 }),
    ).toThrow();

    expect(() =>
      motionPresetSchema.parse({ press: "pop", pressScale: 3 }),
    ).toThrow();
  });
});
