/** @vitest-environment jsdom */

import type {
  DashboardSectionComponentConfig,
  UiLayoutDocument,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { PreviewBreakpointProvider } from "../preview-breakpoint-context.js";
import { EmbeddedLayoutRenderer } from "./EmbeddedLayoutRenderer.js";
import { RecursiveLayoutRenderer } from "./RecursiveLayoutRenderer.js";

const minimalContext: LayoutRenderContext = {
  mode: "dashboardLayout",
  data: {},
  locale: "en",
  resolveField: () => undefined,
};

function createContainerWithChildLayout(options: {
  readonly displayFrom?: "sm";
  readonly displayTo?: "xl";
}): UiLayoutDocument {
  return {
    showActions: true,
    root: {
      type: "screen-root",
      id: "root",
      gridTemplateColumns: "1fr",
      gap: "16px",
      rows: [
        {
          type: "component",
          id: "row-container",
          ...(options.displayFrom ? { displayFrom: options.displayFrom } : {}),
          ...(options.displayTo ? { displayTo: options.displayTo } : {}),
          component: {
            kind: "container",
            rows: [
              {
                type: "component",
                id: "row-child",
                component: {
                  kind: "text",
                  primary: { type: "static", value: "Inside container" },
                },
              },
            ],
          },
        },
      ],
    },
  };
}

function createSectionLayout(): UiLayoutDocument {
  return {
    showActions: true,
    root: {
      type: "root",
      id: "section-root",
      columnCount: 1,
      columns: [
        {
          id: "col-section",
          rows: [
            {
              type: "component",
              id: "row-visible",
              component: {
                kind: "text",
                primary: { type: "static", value: "Always visible" },
              },
            },
            {
              type: "component",
              id: "row-sm-only",
              displayFrom: "sm",
              displayTo: "xl",
              component: {
                kind: "text",
                primary: { type: "static", value: "Tablet only" },
              },
            },
          ],
        },
      ],
    },
  };
}

function createShellLayout(sectionId: string): UiLayoutDocument {
  return {
    showActions: true,
    root: {
      type: "screen-root",
      id: "dashboard-screen",
      gridTemplateColumns: "1fr",
      gap: "24px",
      rows: [
        {
          type: "component",
          id: "row-section-slot",
          component: {
            kind: "dashboard-section",
            sectionId,
          } satisfies DashboardSectionComponentConfig,
        },
      ],
    },
  };
}

function renderSectionAtBreakpoint(
  layout: UiLayoutDocument,
  breakpoint: "base" | "sm",
): string {
  return renderToStaticMarkup(
    <PreviewBreakpointProvider breakpoint={breakpoint}>
      <RecursiveLayoutRenderer layout={layout} context={minimalContext} />
    </PreviewBreakpointProvider>,
  );
}

describe("RecursiveLayoutRenderer display range", () => {
  it("applies responsive visibility classes to container rows and nested content", () => {
    const markup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={createContainerWithChildLayout({
          displayFrom: "sm",
          displayTo: "xl",
        })}
        context={minimalContext}
      />,
    );

    expect(markup).toContain("hidden sm:flex");
    expect(markup).toContain("Inside container");
    expect(markup.indexOf("hidden sm:flex")).toBeLessThan(
      markup.indexOf("Inside container"),
    );
  });

  it("hides nested content in preview when snapped outside the display range", () => {
    const markup = renderToStaticMarkup(
      <PreviewBreakpointProvider breakpoint="base">
        <RecursiveLayoutRenderer
          layout={createContainerWithChildLayout({
            displayFrom: "sm",
            displayTo: "xl",
          })}
          context={minimalContext}
        />
      </PreviewBreakpointProvider>,
    );

    expect(markup).toContain("hidden");
    expect(markup).toContain("Inside container");
  });

  it("matches embedded dashboard section visibility to direct section preview", () => {
    const sectionLayout = createSectionLayout();
    const shellLayout = createShellLayout("section-1");
    const context: LayoutRenderContext = {
      ...minimalContext,
      dashboardSectionRenderer: () => (
        <EmbeddedLayoutRenderer layout={sectionLayout} context={minimalContext} />
      ),
    };

    const directBase = renderSectionAtBreakpoint(sectionLayout, "base");
    const embeddedBase = renderToStaticMarkup(
      <PreviewBreakpointProvider breakpoint="base">
        <RecursiveLayoutRenderer layout={shellLayout} context={context} />
      </PreviewBreakpointProvider>,
    );
    const directSm = renderSectionAtBreakpoint(sectionLayout, "sm");
    const embeddedSm = renderToStaticMarkup(
      <PreviewBreakpointProvider breakpoint="sm">
        <RecursiveLayoutRenderer layout={shellLayout} context={context} />
      </PreviewBreakpointProvider>,
    );

    expect(directBase).toContain("Always visible");
    expect(directBase).toContain("hidden");
    expect(embeddedBase).toContain("Always visible");
    expect(embeddedBase).toContain("hidden");

    expect(directSm).toContain("Always visible");
    expect(directSm).toContain("Tablet only");
    expect(embeddedSm).toContain("Always visible");
    expect(embeddedSm).toContain("Tablet only");
  });
});
