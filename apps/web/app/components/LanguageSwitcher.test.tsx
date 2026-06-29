import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { i18n, loadLocale } from "../i18n";
import { LOCALE_STORAGE_KEY } from "../i18n/constants";
import { LanguageSwitcher } from "./LanguageSwitcher";

function renderSwitcher() {
  return render(
    <I18nextProvider i18n={i18n}>
      <LanguageSwitcher />
    </I18nextProvider>,
  );
}

async function resetLocaleState() {
  localStorage.clear();
  await loadLocale("es");
  await i18n.changeLanguage("en");
}

describe("LanguageSwitcher", () => {
  beforeEach(async () => {
    await resetLocaleState();
  });

  afterEach(async () => {
    cleanup();
    await resetLocaleState();
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

    await act(async () => {
      fireEvent.click(screen.getByRole("radio", { name: "Español" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Español" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    expect(i18n.language).toMatch(/^es/);
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("es");
    expect(screen.getByRole("group", { name: "Idioma" })).toBeInTheDocument();
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
