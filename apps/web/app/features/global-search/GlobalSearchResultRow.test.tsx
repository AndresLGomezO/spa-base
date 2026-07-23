import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18n, loadLocale } from "../../i18n";
import { GlobalSearchResultRow } from "./GlobalSearchResultRow";
import type { GlobalSearchHit } from "./global-search-types";

describe("GlobalSearchResultRow", () => {
  beforeEach(async () => {
    await loadLocale("en");
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders imageUrl when present", () => {
    const hit: GlobalSearchHit = {
      id: "record-org-a1",
      section: "entities",
      label: "Acme",
      to: "/app/org/a1",
      entityName: "org",
      imageUrl: "https://cdn.example/logo.png",
      iconName: "Users",
    };
    const onSelect = vi.fn();

    render(
      <I18nextProvider i18n={i18n}>
        <GlobalSearchResultRow hit={hit} onSelect={onSelect} />
      </I18nextProvider>,
    );

    const image = screen.getByTestId(
      "global-search-result-image-record-org-a1",
    );
    expect(image).toHaveAttribute("src", "https://cdn.example/logo.png");
  });
});
