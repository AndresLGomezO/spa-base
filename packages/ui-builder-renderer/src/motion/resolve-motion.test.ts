import type { CSSProperties } from "react";
import { describe, expect, it } from "vitest";

import { resolveMotionPreset } from "./resolve-motion.js";

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
});
