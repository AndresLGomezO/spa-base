import type { CSSProperties } from "react";
import { describe, expect, it } from "vitest";

import {
  resolveMotionPreset,
  mergeMotionPresetStyle,
} from "./resolve-motion.js";

function motionStyleVar(
  style: CSSProperties | undefined,
  key: string,
): string | undefined {
  if (!style) {
    return undefined;
  }

  return (style as Record<string, string | undefined>)[key];
}

describe("resolveMotionPreset", () => {
  it("returns empty className when preset is undefined", () => {
    expect(resolveMotionPreset(undefined)).toEqual({ className: "" });
  });

  it("maps hoverSurface default to theme hover background CSS variable", () => {
    const resolved = resolveMotionPreset({
      hoverSurface: "default",
    });

    expect(resolved.className).toContain("ui-motion-hover-interactive");
    expect(resolved.style).toEqual({
      "--motion-hover-duration": "150ms",
      "--motion-hover-bg": "var(--color-hover)",
    });
  });

  it("maps accent and muted hover surfaces", () => {
    expect(
      motionStyleVar(
        resolveMotionPreset({ hoverSurface: "accent" }).style,
        "--motion-hover-bg",
      ),
    ).toBe("var(--color-accent-hover)");

    expect(
      motionStyleVar(
        resolveMotionPreset({ hoverSurface: "muted" }).style,
        "--motion-hover-bg",
      ),
    ).toBe("var(--color-muted)");

    expect(
      motionStyleVar(
        resolveMotionPreset({ hoverSurface: "destructive" }).style,
        "--motion-hover-bg",
      ),
    ).toBe("color-mix(in oklch, var(--color-destructive) 40%, transparent)");

    expect(
      motionStyleVar(
        resolveMotionPreset({ hoverSurface: "warning" }).style,
        "--motion-hover-bg",
      ),
    ).toBe("color-mix(in oklch, var(--color-warning) 40%, transparent)");

    expect(
      motionStyleVar(
        resolveMotionPreset({ hoverSurface: "success" }).style,
        "--motion-hover-bg",
      ),
    ).toBe("color-mix(in oklch, var(--color-success) 40%, transparent)");
  });

  it("combines hoverTransform with rotation", () => {
    const resolved = resolveMotionPreset({
      hoverTransform: "scale-up",
      hoverRotateDeg: 3,
    });

    expect(motionStyleVar(resolved.style, "--motion-hover-transform")).toBe(
      "scale(1.02) rotate(3deg)",
    );
  });

  it("maps legacy hover lift to transform and shadow", () => {
    const resolved = resolveMotionPreset({ hover: "lift" });

    expect(resolved.className).toContain("ui-motion-hover-interactive");
    expect(motionStyleVar(resolved.style, "--motion-hover-transform")).toBe(
      "translateY(-2px)",
    );
    expect(motionStyleVar(resolved.style, "--motion-hover-shadow")).toBe(
      "0 4px 12px rgb(0 0 0 / 0.08)",
    );
  });

  it("maps glow-border hover to neon gradient border class", () => {
    const resolved = resolveMotionPreset({
      hoverSurface: "glow-border",
      hoverDurationMs: 200,
    });
    expect(resolved.className).toContain("ui-motion-hover-interactive");
    expect(resolved.className).toContain("ui-motion-hover-glow-border");
    expect(motionStyleVar(resolved.style, "--motion-hover-bg")).toBeUndefined();
  });

  it("maps legacy hover glow to ring shadow", () => {
    const resolved = resolveMotionPreset({ hover: "glow" });

    expect(motionStyleVar(resolved.style, "--motion-hover-shadow")).toBe(
      "0 0 0 2px var(--color-primary, currentColor)",
    );
  });

  it("uses hoverDurationMs for interactive hover timing", () => {
    const resolved = resolveMotionPreset({
      hoverSurface: "default",
      hoverDurationMs: 300,
    });

    expect(motionStyleVar(resolved.style, "--motion-hover-duration")).toBe(
      "300ms",
    );
  });

  it("prefers hoverTransform over legacy hover", () => {
    const resolved = resolveMotionPreset({
      hover: "lift",
      hoverTransform: "none",
      hoverSurface: "default",
    });

    expect(
      motionStyleVar(resolved.style, "--motion-hover-transform"),
    ).toBeUndefined();
    expect(
      motionStyleVar(resolved.style, "--motion-hover-shadow"),
    ).toBeUndefined();
    expect(motionStyleVar(resolved.style, "--motion-hover-bg")).toBe(
      "var(--color-hover)",
    );
  });

  it("includes entrance and stagger classes alongside hover", () => {
    const resolved = resolveMotionPreset(
      {
        entrance: "fade",
        hoverSurface: "default",
        staggerIndex: true,
      },
      2,
    );

    expect(resolved.className).toContain("ui-motion-entrance-fade");
    expect(resolved.className).toContain("ui-motion-hover-interactive");
    expect(resolved.className).toContain("ui-motion-stagger-2");
  });

  it("maps each press kind to classes and CSS variables", () => {
    for (const press of [
      "ripple",
      "glow",
      "wave",
      "neon",
      "pop",
      "slide",
    ] as const) {
      const resolved = resolveMotionPreset({ press });
      expect(resolved.className).toContain("ui-motion-press");
      expect(resolved.className).toContain(`ui-motion-press-${press}`);
      expect(motionStyleVar(resolved.style, "--motion-press-color")).toBe(
        "var(--color-primary)",
      );
      expect(
        motionStyleVar(resolved.style, "--motion-press-duration"),
      ).toBeDefined();
      expect(motionStyleVar(resolved.style, "--motion-press-opacity")).toBe(
        "0.4",
      );
    }
  });

  it("maps pressColor tokens to theme CSS variables", () => {
    expect(
      motionStyleVar(
        resolveMotionPreset({ press: "glow", pressColor: "accent" }).style,
        "--motion-press-color",
      ),
    ).toBe("var(--color-accent)");

    expect(
      motionStyleVar(
        resolveMotionPreset({ press: "ripple", pressColor: "foreground" })
          .style,
        "--motion-press-color",
      ),
    ).toBe("var(--color-foreground)");

    expect(
      motionStyleVar(
        resolveMotionPreset({
          press: "neon",
          pressColor: "destructive",
          pressDurationMs: 300,
          pressGlowBlurPx: 48,
        }).style,
        "--motion-press-glow-blur",
      ),
    ).toBe("48px");

    expect(
      motionStyleVar(
        resolveMotionPreset({
          press: "neon",
          pressColor: "destructive",
          pressDurationMs: 300,
        }).style,
        "--motion-press-duration",
      ),
    ).toBe("300ms");
  });

  it("uses pop scale from pressScale", () => {
    expect(
      motionStyleVar(
        resolveMotionPreset({ press: "pop", pressScale: 1.35 }).style,
        "--motion-press-scale",
      ),
    ).toBe("1.35");
  });
});

describe("mergeMotionPresetStyle", () => {
  it("moves inline backgroundColor to --motion-rest-bg when hover is interactive", () => {
    const motion = resolveMotionPreset({ hoverSurface: "destructive" });
    const merged = mergeMotionPresetStyle(
      {
        backgroundColor:
          "color-mix(in oklch, var(--color-destructive) 24%, transparent)",
        paddingTop: "10px",
      },
      motion,
    );

    expect(merged.backgroundColor).toBeUndefined();
    expect(motionStyleVar(merged, "--motion-rest-bg")).toBe(
      "color-mix(in oklch, var(--color-destructive) 24%, transparent)",
    );
    expect(motionStyleVar(merged, "--motion-hover-bg")).toBe(
      "color-mix(in oklch, var(--color-destructive) 40%, transparent)",
    );
    expect(merged.paddingTop).toBe("10px");
  });

  it("leaves inline backgroundColor when hover is not interactive", () => {
    const motion = resolveMotionPreset(undefined);
    const merged = mergeMotionPresetStyle({ backgroundColor: "red" }, motion);

    expect(merged.backgroundColor).toBe("red");
    expect(motionStyleVar(merged, "--motion-rest-bg")).toBeUndefined();
  });

  it("parks rest background for glow-border so conditional shells keep tint", () => {
    const motion = resolveMotionPreset({ hoverSurface: "glow-border" });
    expect(motion.className).toContain("ui-motion-hover-interactive");
    const tint =
      "color-mix(in oklab, var(--color-destructive) 10%, transparent)";
    const merged = mergeMotionPresetStyle({ backgroundColor: tint }, motion);

    expect(merged.backgroundColor).toBeUndefined();
    expect(motionStyleVar(merged, "--motion-rest-bg")).toBe(tint);
  });
});
