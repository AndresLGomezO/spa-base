/** @vitest-environment jsdom */

import {
  createDefaultMainPageLayout,
  createDefaultSidebarNavComponent,
  ensureStandardRoot,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { RecursiveLayoutRenderer } from "./RecursiveLayoutRenderer.js";

const context: LayoutRenderContext = {
  mode: "mainPage",
  data: {},
  locale: "en",
  resolveField: () => undefined,
  pageToolbarRenderer: () => createElement("div", null, "toolbar"),
  pageMetricsRenderer: () => createElement("div", null, "metrics"),
  pageListRenderer: () => createElement("div", null, "list"),
  wrapPageListScroll: (listContent) =>
    createElement(
      "div",
      {
        "data-entity-page-list-scroll": "",
        className:
          "relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden",
      },
      listContent,
    ),
};

function renderMainPage(layout: UiLayoutDocument): string {
  return renderToStaticMarkup(
    <RecursiveLayoutRenderer
      layout={ensureStandardRoot("screen", layout)}
      context={context}
    />,
  );
}

describe("RecursiveLayoutRenderer main page list scroll", () => {
  it("keeps a flex height chain so page-list can overflow-y-auto", () => {
    const html = renderMainPage(createDefaultMainPageLayout());

    expect(html).toContain(
      "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
    );
    expect(html).toContain('data-entity-page-list-scroll=""');
    expect(html).toContain("overflow-y-auto");
    // Migrated single-column page shell must not stay a CSS grid (breaks flex-1).
    expect(html).not.toMatch(
      /data-layout-row-id="row-[^"]+"[^>]*style="[^"]*display:\s*grid/,
    );
  });

  it("stretches the nested page-list track container with min-h-0 flex-1", () => {
    const html = renderMainPage(createDefaultMainPageLayout());

    expect(html).toMatch(
      /relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden/,
    );
    expect(html).toContain("toolbar");
    expect(html).toContain("metrics");
    expect(html).toContain("list");
  });

  it("does not height-fill app-shell chrome without page-list (sidebar nav scroll)", () => {
    const sidebarNavSection: UiLayoutDocument = {
      root: {
        type: "screen-root",
        id: "sidebar-nav-section-root",
        gridTemplateColumns: "1fr",
        rows: [
          {
            type: "component",
            id: "sidebar-nav",
            component: createDefaultSidebarNavComponent(),
          },
        ],
      },
      showActions: false,
    };

    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer layout={sidebarNavSection} context={context} />,
    );

    expect(html).not.toContain(
      "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
    );
    expect(html).toContain("flex w-full min-w-0 max-w-full flex-col");
  });
});
