/** @vitest-environment jsdom */

import {
  containerUsesPercentSplitHeight,
  isContainerComponent,
  resolveContainerPercentSplitFlexStyle,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { RecursiveLayoutRenderer } from "./RecursiveLayoutRenderer.js";

const listItemContext: LayoutRenderContext = {
  mode: "listItem",
  data: {},
  locale: "en",
  resolveField: () => undefined,
};

const userWidgetLayout: UiLayoutDocument = {
  showActions: true,
  root: {
    type: "root",
    id: "root-doc",
    columnCount: 1,
    columns: [
      {
        id: "col-1",
        rows: [
          {
            type: "component",
            id: "row-root-container",
            component: {
              kind: "container",
              stackDirection: "column",
              styles: [{ property: "minHeight", value: "200" }],
              rows: [
                {
                  type: "component",
                  id: "row-content",
                  component: {
                    kind: "container",
                    stackDirection: "column",
                    styles: [{ property: "height", value: "100%" }],
                    rows: [
                      {
                        type: "component",
                        id: "row-first",
                        component: {
                          kind: "container",
                          styles: [{ property: "height", value: "60%" }],
                          rows: [],
                        },
                      },
                      {
                        type: "component",
                        id: "row-second",
                        component: {
                          kind: "container",
                          styles: [{ property: "height", value: "10%" }],
                          rows: [],
                        },
                      },
                      {
                        type: "component",
                        id: "row-third",
                        component: {
                          kind: "container",
                          styles: [{ property: "height", value: "30%" }],
                          rows: [],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  },
};

function extractLayoutGeometry(html: string): string[] {
  const tokens = new Set<string>();

  for (const match of html.matchAll(/style="([^"]*)"/g)) {
    const style = match[1] ?? "";

    for (const flexMatch of style.matchAll(/flex:0 0 [^;]+/g)) {
      tokens.add(flexMatch[0]!);
    }

    if (style.includes("height:200px") || style.includes("min-height:200px")) {
      tokens.add("root-height-200");
    }

    if (style.includes("height:100%")) {
      tokens.add("fill-height-100");
    }
  }

  return [...tokens].sort();
}

function previewSplitRowWrapper(
  row: Parameters<
    NonNullable<Parameters<typeof RecursiveLayoutRenderer>[0]["rowWrapper"]>
  >[0],
  _locator: Parameters<
    NonNullable<Parameters<typeof RecursiveLayoutRenderer>[0]["rowWrapper"]>
  >[1],
  children: Parameters<
    NonNullable<Parameters<typeof RecursiveLayoutRenderer>[0]["rowWrapper"]>
  >[2],
) {
  const splitFlex =
    row.type === "component" &&
    isContainerComponent(row.component) &&
    containerUsesPercentSplitHeight(row.component.styles)
      ? resolveContainerPercentSplitFlexStyle(row.component.styles)
      : undefined;

  return (
    <div
      className="relative flex min-h-0 h-full w-full min-w-0 shrink-0 flex-col"
      style={splitFlex}
    >
      <div className="relative z-0 flex h-full min-h-0 w-full min-w-0 flex-col">
        {children}
      </div>
    </div>
  );
}

describe("RecursiveLayoutRenderer geometry parity", () => {
  it("matches layout geometry with and without rowWrapper", () => {
    const withoutWrapper = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={userWidgetLayout}
        context={listItemContext}
      />,
    );

    const withWrapper = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={userWidgetLayout}
        context={listItemContext}
        rowWrapper={previewSplitRowWrapper}
      />,
    );

    expect(extractLayoutGeometry(withoutWrapper)).toEqual(
      extractLayoutGeometry(withWrapper),
    );
  });
});
