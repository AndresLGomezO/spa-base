import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeColorSync } from "./ThemeColorSync";

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
    document.body.style.backgroundColor = "rgb(248, 250, 252)";
    document
      .querySelectorAll('meta[name="theme-color"]')
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

  it("writes the body background into the theme-color meta", async () => {
    render(<ThemeColorSync />);

    await vi.waitFor(() => {
      const meta = document.querySelector('meta[name="theme-color"]');
      expect(meta?.getAttribute("content")).toBe("rgb(248, 250, 252)");
    });
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("sets dark color-scheme when the theme is dark", async () => {
    useColorSchemeMock.mockReturnValue({
      colorScheme: "dark",
      setColorScheme: vi.fn(),
      toggleColorScheme: vi.fn(),
    });
    document.body.style.backgroundColor = "rgb(11, 13, 20)";

    render(<ThemeColorSync />);

    await vi.waitFor(() => {
      expect(document.documentElement.style.colorScheme).toBe("dark");
      expect(
        document
          .querySelector('meta[name="theme-color"]')
          ?.getAttribute("content"),
      ).toBe("rgb(11, 13, 20)");
    });
  });
});
