import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider } from "@repo/theme/react";

import { i18n } from "../i18n";
import { ThemeToggle } from "./ThemeToggle";

function renderToggle() {
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    </I18nextProvider>,
  );
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    cleanup();
  });

  it("shows light mode as active by default", () => {
    renderToggle();

    expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Switch to light mode" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("radio", { name: "Switch to dark mode" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("switches to dark mode on click and persists to localStorage", () => {
    renderToggle();

    fireEvent.click(screen.getByRole("radio", { name: "Switch to dark mode" }));

    expect(
      screen.getByRole("radio", { name: "Switch to dark mode" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("radio", { name: "Switch to light mode" }),
    ).toHaveAttribute("aria-checked", "false");
    expect(localStorage.getItem("color_scheme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("restores dark mode from localStorage", () => {
    localStorage.setItem("color_scheme", "dark");

    renderToggle();

    expect(
      screen.getByRole("radio", { name: "Switch to dark mode" }),
    ).toHaveAttribute("aria-checked", "true");
  });
});
