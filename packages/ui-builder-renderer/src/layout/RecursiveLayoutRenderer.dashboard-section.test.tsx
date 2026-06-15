/** @vitest-environment jsdom */

import {
  ensureContainerRoot,
  type DashboardSectionComponentConfig,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { RecursiveLayoutRenderer } from "./RecursiveLayoutRenderer.js";

const sectionLayout: UiLayoutDocument = ensureContainerRoot({
  showActions: true,
  root: {
    type: "root",
    id: "root-section",
    columnCount: 1,
    columns: [
      {
        id: "col-section",
        rows: [
          {
            type: "component",
            id: "row-section-container",
            component: {
              kind: "container",
              styles: [{ property: "alignItems", value: "start" }],
              rows: [
                {
                  type: "component",
                  id: "row-greeting",
                  component: {
                    kind: "text",
                    primary: { type: "static", value: "Hello," },
                    styles: [{ property: "flex", value: "0" }],
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  },
});

function createDashboardLayout(sectionId: string): UiLayoutDocument {
  return ensureContainerRoot({
    showActions: true,
    root: {
      type: "root",
      id: "root-dashboard",
      columnCount: 1,
      columns: [
        {
          id: "col-dashboard",
          rows: [
            {
              type: "component",
              id: "row-dashboard-section",
              component: {
                kind: "dashboard-section",
                sectionId,
              } satisfies DashboardSectionComponentConfig,
            },
          ],
        },
      ],
    },
  });
}

function createContextWithoutSectionRenderer(): LayoutRenderContext {
  return {
    mode: "listItem",
    data: {},
    locale: "en",
    resolveField: () => undefined,
  };
}

describe("RecursiveLayoutRenderer dashboard-section", () => {
  it("renders static text from an embedded section under stretchRootColumns", () => {
    const markup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={createDashboardLayout("section-1")}
        context={{
          mode: "listItem",
          data: {},
          locale: "en",
          resolveField: () => undefined,
          dashboardSectionRenderer: () => (
            <div className="min-w-0 w-full">
              <RecursiveLayoutRenderer
                layout={sectionLayout}
                context={createContextWithoutSectionRenderer()}
              />
            </div>
          ),
        }}
        stretchRootColumns
      />,
    );

    expect(markup).toContain("Hello,");
  });
});
