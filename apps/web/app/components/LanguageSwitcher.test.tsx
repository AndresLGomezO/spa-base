import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { i18n } from "../i18n";
import { LOCALE_STORAGE_KEY } from "../i18n/constants";
import { LanguageSwitcher } from "./LanguageSwitcher";

function renderSwitcher() {
  return render(
    <I18nextProvider i18n={i18n}>
      <LanguageSwitcher />
    </I18nextProvider>,
  );
}

describe("LanguageSwitcher", () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    cleanup();
  });

  it("shows English as active by default", () => {
    renderSwitcher();

    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "English" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Español" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("switches to Spanish and persists to localStorage", async () => {
    renderSwitcher();

    fireEvent.click(screen.getByRole("radio", { name: "Español" }));

    await waitFor(() => {
      expect(i18n.language).toMatch(/^es/);
    });

    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("es");
    expect(screen.getByRole("group", { name: "Idioma" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Español" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("restores Spanish from localStorage on init", async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "es");
    await i18n.changeLanguage("es");

    renderSwitcher();

    expect(screen.getByRole("radio", { name: "Español" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
