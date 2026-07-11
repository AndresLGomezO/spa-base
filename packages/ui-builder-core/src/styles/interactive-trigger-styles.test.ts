import { describe, expect, it } from "vitest";

import {
  interactiveNotificationBellIconClass,
  interactiveSearchFieldClass,
  interactiveTriggerBaseClass,
  stylesIncludeVisualChrome,
} from "./interactive-trigger-styles.js";

describe("interactiveTriggerBaseClass", () => {
  it("omits border and shadow resets when custom chrome is present", () => {
    expect(interactiveTriggerBaseClass(true)).not.toContain("border-0");
    expect(interactiveTriggerBaseClass(true)).not.toContain("shadow-none");
    expect(interactiveTriggerBaseClass(false)).toContain("border-0");
    expect(interactiveTriggerBaseClass(false)).toContain("shadow-none");
  });
});

describe("stylesIncludeVisualChrome", () => {
  it("detects border and background style rules", () => {
    expect(
      stylesIncludeVisualChrome([
        { property: "borderColor", value: "primary" },
      ]),
    ).toBe(true);
    expect(
      stylesIncludeVisualChrome([
        { property: "backgroundColor", value: "var(--gradient-primary)" },
      ]),
    ).toBe(true);
    expect(
      stylesIncludeVisualChrome([{ property: "marginTop", value: "8px" }]),
    ).toBe(false);
  });
});

describe("interactiveNotificationBellIconClass", () => {
  it("highlights icon strokes on hover and active", () => {
    expect(interactiveNotificationBellIconClass()).toContain(
      "group-hover:text-[var(--color-primary-hover)]",
    );
    expect(interactiveNotificationBellIconClass()).toContain(
      "group-active:text-[var(--color-primary-active)]",
    );
    expect(interactiveNotificationBellIconClass()).not.toContain("border");
  });

  it("marks open state as active icon color", () => {
    expect(interactiveNotificationBellIconClass(true)).toContain(
      "text-[var(--color-primary-active)]",
    );
  });
});

describe("interactiveSearchFieldClass", () => {
  it("includes hover, focus, and active border tokens", () => {
    expect(interactiveSearchFieldClass()).toContain(
      "hover:border-[var(--color-primary-hover)]",
    );
    expect(interactiveSearchFieldClass()).toContain(
      "focus-visible:border-primary",
    );
    expect(interactiveSearchFieldClass()).toContain(
      "active:border-[var(--color-primary-active)]",
    );
  });
});
