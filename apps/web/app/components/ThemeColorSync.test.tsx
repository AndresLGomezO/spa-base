import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ensureViewportFitCover,
  resolvePageBackgroundColor,
  ThemeColorSync,
} from "./ThemeColorSync";

const useColorSchemeMock = vi.fn(() => ({
  colorScheme: "light" as "light" | "dark",
  setColorScheme: vi.fn(),
  toggleColorScheme: vi.fn(),
}));

const useAuthMock = vi.fn(() => ({
  tenantAppearance: null,
  isAuthenticated: false,
  isSessionResolved: true,
}));

vi.mock("@repo/theme/react", () => ({
  useColorScheme: () => useColorSchemeMock(),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

describe("ThemeColorSync", () => {
  beforeEach(() => {
    document.documentElement.style.backgroundColor = "";
    document.documentElement.style.backgroundImage = "";
    document.body.style.backgroundColor = "rgb(248, 250, 252)";
    document.documentElement.style.setProperty(
      "--color-background",
      "rgb(248, 250, 252)",
    );
    document
      .querySelectorAll(
        'meta[name="theme-color"], meta[name="apple-mobile-web-app-status-bar-style"], meta[name="viewport"]',
      )
      .forEach((node) => node.remove());
    const viewport = document.createElement("meta");
    viewport.setAttribute("name", "viewport");
    viewport.setAttribute(
      "content",
      "width=device-width, initial-scale=1, viewport-fit=cover",
    );
    document.head.appendChild(viewport);
    useColorSchemeMock.mockReturnValue({
      colorScheme: "light",
      setColorScheme: vi.fn(),
      toggleColorScheme: vi.fn(),
    });
    useAuthMock.mockReturnValue({
      tenantAppearance: null,
      isAuthenticated: false,
      isSessionResolved: true,
    });
    vi.stubGlobal("navigator", {
      ...navigator,
      userAgent: "Mozilla/5.0 (Linux; Android 14)",
    });
  });

  it("writes the page background into theme-color on Android", async () => {
    render(<ThemeColorSync />);

    await vi.waitFor(() => {
      expect(
        document
          .querySelector('meta[name="theme-color"]')
          ?.getAttribute("content"),
      ).toBe("rgb(248, 250, 252)");
      expect(
        document
          .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
          ?.getAttribute("content"),
      ).toBe("black-translucent");
    });
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(document.documentElement.style.backgroundColor).toBe(
      "rgb(248, 250, 252)",
    );
  });

  it("uses black-translucent and dark theme-color in dark mode", async () => {
    useColorSchemeMock.mockReturnValue({
      colorScheme: "dark",
      setColorScheme: vi.fn(),
      toggleColorScheme: vi.fn(),
    });
    document.documentElement.style.setProperty(
      "--color-background",
      "rgb(11, 13, 20)",
    );
    document.body.style.backgroundColor = "rgb(11, 13, 20)";

    render(<ThemeColorSync />);

    await vi.waitFor(() => {
      expect(document.documentElement.style.colorScheme).toBe("dark");
      expect(
        document
          .querySelector('meta[name="theme-color"]')
          ?.getAttribute("content"),
      ).toBe("rgb(11, 13, 20)");
      expect(
        document
          .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
          ?.getAttribute("content"),
      ).toBe("black-translucent");
    });
  });

  it("keeps a solid theme-color when the root has a gradient background", async () => {
    document.documentElement.style.backgroundImage =
      "linear-gradient(red, blue)";

    render(<ThemeColorSync />);

    await vi.waitFor(() => {
      expect(
        document
          .querySelector('meta[name="theme-color"]')
          ?.getAttribute("content"),
      ).toBe("rgb(248, 250, 252)");
    });
  });

  it("uses default status bar style on iOS in light mode", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });

    render(<ThemeColorSync />);

    await vi.waitFor(() => {
      expect(
        document
          .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
          ?.getAttribute("content"),
      ).toBe("default");
    });
  });

  it("resolvePageBackgroundColor falls back by scheme when colors are transparent", () => {
    document.documentElement.style.backgroundColor = "rgba(0, 0, 0, 0)";
    document.body.style.backgroundColor = "rgba(0, 0, 0, 0)";
    document.documentElement.style.removeProperty("--color-background");

    expect(resolvePageBackgroundColor("light")).toBe("#ffffff");
    expect(resolvePageBackgroundColor("dark")).toBe("#0a0a0a");
  });

  it("ensureViewportFitCover appends viewport-fit when missing", () => {
    document
      .querySelector('meta[name="viewport"]')
      ?.setAttribute("content", "width=device-width, initial-scale=1");

    ensureViewportFitCover();

    expect(
      document.querySelector('meta[name="viewport"]')?.getAttribute("content"),
    ).toMatch(/viewport-fit=cover/);
  });
});
