import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
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
    document.body.style.backgroundColor = "rgb(248, 250, 252)";
    document.documentElement.style.setProperty(
      "--color-background",
      "rgb(248, 250, 252)",
    );
    document
      .querySelectorAll(
        'meta[name="theme-color"], meta[name="apple-mobile-web-app-status-bar-style"]',
      )
      .forEach((node) => node.remove());
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
  });

  it("writes the page background into theme-color and uses default status bar in light mode", async () => {
    render(<ThemeColorSync />);

    await vi.waitFor(() => {
      expect(
        document.querySelector('meta[name="theme-color"]')?.getAttribute(
          "content",
        ),
      ).toBe("rgb(248, 250, 252)");
      expect(
        document
          .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
          ?.getAttribute("content"),
      ).toBe("default");
    });
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("uses black-translucent status bar and dark theme-color in dark mode", async () => {
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
        document.querySelector('meta[name="theme-color"]')?.getAttribute(
          "content",
        ),
      ).toBe("rgb(11, 13, 20)");
      expect(
        document
          .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
          ?.getAttribute("content"),
      ).toBe("black-translucent");
    });
  });

  it("resolvePageBackgroundColor falls back by scheme when colors are transparent", () => {
    document.documentElement.style.backgroundColor = "rgba(0, 0, 0, 0)";
    document.body.style.backgroundColor = "rgba(0, 0, 0, 0)";
    document.documentElement.style.removeProperty("--color-background");

    expect(resolvePageBackgroundColor("light")).toBe("#ffffff");
    expect(resolvePageBackgroundColor("dark")).toBe("#0a0a0a");
  });
});
