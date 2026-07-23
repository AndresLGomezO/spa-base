import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18n, loadLocale } from "../../i18n";
import { GlobalSearchPanel } from "./GlobalSearchPanel";
import type { GlobalSearchHit } from "./global-search-types";

const hits: readonly GlobalSearchHit[] = [
  {
    id: "feature-home",
    section: "features",
    label: "Home",
    description: "Dashboard",
    to: "/",
    iconName: "Home",
  },
  {
    id: "entity-actor",
    section: "entities",
    label: "Accounts",
    to: "/app/actor",
    iconName: "Users",
  },
];

describe("GlobalSearchPanel", () => {
  beforeEach(async () => {
    await loadLocale("en");
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    cleanup();
  });

  it("hides empty sections and supports removing recent", async () => {
    const onSelect = vi.fn();
    const onQueryChange = vi.fn();
    const onRemoveRecent = vi.fn();

    const { rerender } = render(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <GlobalSearchPanel
            query="ho"
            onQueryChange={onQueryChange}
            recent={[]}
            isLoading
            topResults={[]}
            bySection={{ entities: [], features: [], views: [] }}
            onSelect={onSelect}
            showQueryField
          />
        </I18nextProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("global-search-loading")).toBeInTheDocument();
    expect(
      screen.queryByTestId("global-search-recent"),
    ).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <GlobalSearchPanel
            query="ho"
            onQueryChange={onQueryChange}
            recent={[
              {
                ...hits[0]!,
                at: 1,
              },
            ]}
            isLoading={false}
            topResults={[hits[0]!]}
            bySection={{
              entities: [hits[1]!],
              features: [hits[0]!],
              views: [],
            }}
            onSelect={onSelect}
            onRemoveRecent={onRemoveRecent}
            showQueryField
          />
        </I18nextProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("global-search-top-results")).toBeInTheDocument();
    expect(
      screen.getByTestId("global-search-section-entities"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("global-search-entities-types"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("global-search-section-features"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("global-search-section-views"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByTestId("global-search-remove-recent-feature-home"),
    );
    expect(onRemoveRecent).toHaveBeenCalledWith("feature-home");

    fireEvent.click(
      within(screen.getByTestId("global-search-top-results")).getByRole(
        "button",
        { name: /Home/ },
      ),
    );
    expect(onSelect).toHaveBeenCalledWith(hits[0]);

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "accounts" },
    });
    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalledWith("accounts");
    });
  });

  it("groups record hits by catalog entity name", () => {
    const onSelect = vi.fn();
    const recordHit: GlobalSearchHit = {
      id: "record-emailMessage-1",
      section: "entities",
      label: "Uber receipt",
      description: "Emails",
      to: "/app/emailMessage/1",
      entityName: "emailMessage",
    };

    render(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <GlobalSearchPanel
            query="uber"
            onQueryChange={vi.fn()}
            recent={[]}
            isLoading={false}
            topResults={[]}
            bySection={{
              entities: [recordHit],
              features: [],
              views: [],
            }}
            onSelect={onSelect}
          />
        </I18nextProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByTestId("global-search-entities-emailMessage"),
    ).toBeInTheDocument();
    expect(screen.getByText("Uber receipt")).toBeInTheDocument();
  });
});
