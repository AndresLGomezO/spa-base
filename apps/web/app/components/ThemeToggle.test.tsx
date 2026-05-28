import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider } from "@repo/theme/react";

import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    cleanup();
  });

  it("shows switch to dark mode when light", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggle = screen.getByRole("switch", { name: "Switch to dark mode" });

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveTextContent("Dark");
  });

  it("toggles to dark mode on click and persists to localStorage", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggle = screen.getByRole("switch", { name: "Switch to dark mode" });

    fireEvent.click(toggle);

    expect(
      screen.getByRole("switch", { name: "Switch to light mode" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch")).toHaveTextContent("Light");
    expect(localStorage.getItem("color_scheme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("restores dark mode from localStorage", () => {
    localStorage.setItem("color_scheme", "dark");

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole("switch", { name: "Switch to light mode" }),
    ).toHaveAttribute("aria-checked", "true");
  });
});
