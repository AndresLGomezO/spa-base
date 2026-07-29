import { describe, expect, it } from "vitest";

import { localeDisplayName, normalizeLocale } from "../../i18n/constants";

describe("locale helpers for translations / LanguageSwitcher", () => {
  it("normalizes locale codes to base language", () => {
    expect(normalizeLocale("es-CO")).toBe("es");
    expect(normalizeLocale(undefined)).toBe("en");
    expect(normalizeLocale("fr")).toBe("fr");
  });

  it("resolves display names for known and unknown locales", () => {
    expect(localeDisplayName("en")).toBe("English");
    expect(localeDisplayName("es")).toBe("Español");
    expect(localeDisplayName("it").length).toBeGreaterThan(0);
  });
});
