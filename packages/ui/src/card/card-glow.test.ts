import { describe, expect, it } from "vitest";

import {
  resolveCardGlowBackground,
  resolveCardGlowGradient,
} from "./card-glow.js";

describe("card-glow", () => {
  it("resolves legacy and semantic glow gradient vars", () => {
    expect(resolveCardGlowGradient("success")).toBe(
      "var(--gradient-card-glow-success)",
    );
    expect(resolveCardGlowGradient("green")).toBe(
      "var(--gradient-card-glow-green)",
    );
  });

  it("layers glow gradient over card fill", () => {
    expect(resolveCardGlowBackground("danger")).toBe(
      "var(--gradient-card-glow-danger), linear-gradient(var(--color-card), var(--color-card))",
    );
  });
});
