import { describe, expect, it } from "vitest";

import {
  componentKindsForSurface,
  isComponentKindAllowedOnSurface,
} from "./design-surface.js";

describe("formPlain surface", () => {
  it("allows display component kinds", () => {
    for (const kind of [
      "text",
      "image",
      "icon",
      "date",
      "numeric",
      "badge",
    ] as const) {
      expect(isComponentKindAllowedOnSurface(kind, "formPlain")).toBe(true);
      expect(componentKindsForSurface("formPlain")).toContain(kind);
    }
  });

  it("still allows editable form slots", () => {
    expect(isComponentKindAllowedOnSurface("form-field", "formPlain")).toBe(
      true,
    );
    expect(
      isComponentKindAllowedOnSurface("entity-field-selector", "formPlain"),
    ).toBe(true);
  });
});

describe("metricWidget surface", () => {
  it("allows query-viewer for entity-query snapshot cards", () => {
    expect(
      isComponentKindAllowedOnSurface("query-viewer", "metricWidget"),
    ).toBe(true);
    expect(componentKindsForSurface("metricWidget")).toContain("query-viewer");
  });
});

describe("sidebarLayout surface", () => {
  it("allows sidebar chrome kinds", () => {
    for (const kind of [
      "image",
      "user",
      "notification-bell",
      "sidebar-nav",
      "sidebar-collapse",
      "container",
      "grid",
    ] as const) {
      expect(isComponentKindAllowedOnSurface(kind, "sidebarLayout")).toBe(true);
    }
  });

  it("rejects dashboard-only kinds", () => {
    expect(
      isComponentKindAllowedOnSurface("dashboard-section", "sidebarLayout"),
    ).toBe(false);
    expect(
      isComponentKindAllowedOnSurface("metric-widget", "sidebarLayout"),
    ).toBe(false);
  });
});

describe("headerLayout surface", () => {
  it("allows header chrome kinds", () => {
    for (const kind of [
      "image",
      "icon",
      "text",
      "user",
      "sidebar-trigger",
      "container",
      "grid",
    ] as const) {
      expect(isComponentKindAllowedOnSurface(kind, "headerLayout")).toBe(true);
    }
    for (const kind of [
      "image",
      "icon",
      "text",
      "user",
      "sidebar-trigger",
    ] as const) {
      expect(componentKindsForSurface("headerLayout")).toContain(kind);
    }
  });

  it("rejects sidebar-only and footer-only kinds", () => {
    expect(isComponentKindAllowedOnSurface("sidebar-nav", "headerLayout")).toBe(
      false,
    );
    expect(isComponentKindAllowedOnSurface("nav-tab", "headerLayout")).toBe(
      false,
    );
  });
});

describe("footerLayout surface", () => {
  it("allows footer chrome kinds", () => {
    for (const kind of [
      "image",
      "icon",
      "text",
      "user",
      "nav-tab",
      "container",
      "grid",
    ] as const) {
      expect(isComponentKindAllowedOnSurface(kind, "footerLayout")).toBe(true);
    }
    for (const kind of ["image", "icon", "text", "user", "nav-tab"] as const) {
      expect(componentKindsForSurface("footerLayout")).toContain(kind);
    }
  });

  it("rejects sidebar-only and header-only kinds", () => {
    expect(
      isComponentKindAllowedOnSurface("sidebar-collapse", "footerLayout"),
    ).toBe(false);
    expect(
      isComponentKindAllowedOnSurface("sidebar-trigger", "footerLayout"),
    ).toBe(false);
  });
});
