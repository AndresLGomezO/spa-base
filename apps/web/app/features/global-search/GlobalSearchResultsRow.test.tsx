import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { i18n, loadLocale } from "../../i18n";
import { GlobalSearchResultsRow } from "./GlobalSearchResultsRow";
import type { GlobalSearchHit } from "./global-search-types";

describe("GlobalSearchResultsRow", () => {
  beforeEach(async () => {
    await loadLocale("en");
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a linked name and kind badge", () => {
    const hit: GlobalSearchHit = {
      id: "feature-home",
      section: "features",
      label: "Home",
      description: "Dashboard",
      to: "/",
      iconName: "Home",
    };

    render(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <ul>
            <GlobalSearchResultsRow hit={hit} />
          </ul>
        </I18nextProvider>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveAttribute("href", "/");
    expect(screen.getByText("Feature")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders record snippets and images on the results page", () => {
    const hit: GlobalSearchHit = {
      id: "record-emailMessage-1",
      section: "entities",
      label: "Uber receipt",
      description: "Emails",
      snippet: "Paid uber yesterday · Receipt attached",
      to: "/app/emailMessage/1",
      entityName: "emailMessage",
      imageUrl: "https://cdn.example/logo.png",
    };

    render(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <ul>
            <GlobalSearchResultsRow hit={hit} />
          </ul>
        </I18nextProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Uber receipt" })).toHaveAttribute(
      "href",
      "/app/emailMessage/1",
    );
    expect(screen.getByText("Emails")).toBeInTheDocument();
    expect(
      screen.getByText("Paid uber yesterday · Receipt attached"),
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId("global-search-results-row-record-emailMessage-1")
        .querySelector("img"),
    ).toHaveAttribute("src", "https://cdn.example/logo.png");
  });
});
