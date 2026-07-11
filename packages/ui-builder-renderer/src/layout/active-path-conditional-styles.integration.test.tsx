/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "../context.js";
import { EmbeddedLayoutRenderer } from "../layout/EmbeddedLayoutRenderer.js";

describe("activePath conditional styles in layout render", () => {
  it("applies container conditional styles when pathname matches", () => {
    const layout: UiLayoutDocument = {
      root: {
        type: "root",
        id: "root",
        columnCount: 1,
        columns: [
          {
            id: "col",
            rows: [
              {
                type: "component",
                id: "row-nav",
                component: {
                  kind: "container",
                  stackDirection: "column",
                  rows: [],
                  styles: [
                    {
                      property: "backgroundColor",
                      value: "transparent",
                    },
                  ],
                  conditionalStyles: [
                    {
                      conditionKind: "activePath",
                      matchValue: "/app/views/transactions-this-month",
                      styles: [
                        {
                          property: "backgroundColor",
                          value: "primary",
                        },
                        { property: "color", value: "primary" },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    const context: LayoutRenderContext = {
      mode: "mainPage",
      data: {},
      locale: "en",
      resolveField: () => undefined,
      resolveActivePathname: () => "/app/views/transactions-this-month",
    };

    const html = renderToStaticMarkup(
      <EmbeddedLayoutRenderer layout={layout} context={context} />,
    );

    expect(html).toContain("bg-primary/10");
    expect(html).toContain("text-primary");
    expect(html).not.toContain("bg-transparent");
  });

  it("does not apply when pathname does not match", () => {
    const layout: UiLayoutDocument = {
      root: {
        type: "root",
        id: "root",
        columnCount: 1,
        columns: [
          {
            id: "col",
            rows: [
              {
                type: "component",
                id: "row-nav",
                component: {
                  kind: "container",
                  stackDirection: "column",
                  rows: [],
                  conditionalStyles: [
                    {
                      conditionKind: "activePath",
                      matchValue: "/app/views/transactions-this-month",
                      styles: [
                        { property: "backgroundColor", value: "accent" },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    const context: LayoutRenderContext = {
      mode: "mainPage",
      data: {},
      locale: "en",
      resolveField: () => undefined,
      resolveActivePathname: () => "/",
    };

    const html = renderToStaticMarkup(
      <EmbeddedLayoutRenderer layout={layout} context={context} />,
    );

    expect(html).not.toContain("bg-accent");
  });

  it("applies icon color overrides from activePath conditional styles", () => {
    const layout: UiLayoutDocument = {
      root: {
        type: "root",
        id: "root",
        columnCount: 1,
        columns: [
          {
            id: "col",
            rows: [
              {
                type: "component",
                id: "row-icon",
                component: {
                  kind: "icon",
                  iconName: "Home",
                  iconSize: 20,
                  styles: [{ property: "color", value: "#8b8f9a" }],
                  conditionalStyles: [
                    {
                      conditionKind: "activePath",
                      matchValue: "/app/views/transactions-this-month",
                      styles: [{ property: "color", value: "primary" }],
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    const context: LayoutRenderContext = {
      mode: "mainPage",
      data: {},
      locale: "en",
      resolveField: () => undefined,
      resolveActivePathname: () => "/app/views/transactions-this-month",
      lucideIconRenderer: (config) => (
        <span data-icon-color={String(config.styles?.[0]?.value ?? "")} />
      ),
    };

    const html = renderToStaticMarkup(
      <EmbeddedLayoutRenderer layout={layout} context={context} />,
    );

    expect(html).toContain('data-icon-color="primary"');
    expect(html).not.toContain("#8b8f9a");
  });
});
