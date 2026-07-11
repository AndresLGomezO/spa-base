/** @vitest-environment jsdom */

import {
  ensureContainerRoot,
  normalizeRuntimeRowInnerClassName,
  normalizeRuntimeRowShellClassName,
  resolveParentGridAlignItems,
  resolveParentIsGrid,
  resolveParentStackAlign,
  resolveParentStackDirection,
  resolveParentStackStyles,
  resolveParentStackUsesFlexWrap,
  resolveRowShellLayoutForRender,
  type MetricWidgetComponentConfig,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { EmbeddedLayoutRenderer } from "./EmbeddedLayoutRenderer.js";
import type { RowWrapper } from "./layout-wrapper-types.js";
import { RecursiveLayoutRenderer } from "./RecursiveLayoutRenderer.js";

const listItemContext: LayoutRenderContext = {
  mode: "listItem",
  data: {},
  locale: "en",
  resolveField: () => undefined,
};

function createSnapshotMiniWidgetLayout(): UiLayoutDocument {
  return ensureContainerRoot({
    showActions: true,
    root: {
      type: "root",
      id: "root-widget",
      columnCount: 1,
      columns: [
        {
          id: "col-widget",
          rows: [
            {
              type: "component",
              id: "row-shell",
              component: {
                kind: "container",
                stackDirection: "row",
                styles: [
                  { property: "gap", value: "12" },
                  { property: "alignItems", value: "start" },
                ],
                rows: [
                  {
                    type: "component",
                    id: "row-icon",
                    component: {
                      kind: "icon",
                      iconName: "Folder",
                      styles: [
                        { property: "padding", value: "10" },
                        { property: "borderRadius", value: "12" },
                        { property: "backgroundColor", value: "danger" },
                      ],
                    },
                  },
                  {
                    type: "component",
                    id: "row-body",
                    component: {
                      kind: "container",
                      stackDirection: "column",
                      rows: [
                        {
                          type: "component",
                          id: "row-d21b57e7-0ff0-4000-858c-a4cea5936a3c",
                          component: {
                            kind: "grid",
                            gridTemplateColumns: "repeat(1, 1fr) auto",
                            rows: [
                              {
                                type: "component",
                                id: "row-056ac1ab-5996-442c-a54f-0fb5ff972ee6",
                                component: {
                                  kind: "container",
                                  rows: [
                                    {
                                      type: "component",
                                      id: "row-ce14d1ab-8287-45ec-9248-297586a51352",
                                      component: {
                                        kind: "metric-kpi",
                                        metricDefinitionId: "Due Today Total",
                                        groupBindings: {},
                                        dimensionBindings: {},
                                        label: "",
                                        styles: [
                                          {
                                            property: "fontSize",
                                            value: "20",
                                          },
                                        ],
                                      },
                                    },
                                    {
                                      type: "component",
                                      id: "row-1a3ad7a5-4c30-48d8-863c-be4dcfb0d3c5",
                                      component: {
                                        kind: "text",
                                        primary: {
                                          type: "static",
                                          value: "Payment due",
                                        },
                                        styles: [
                                          {
                                            property: "fontSize",
                                            value: "12",
                                          },
                                        ],
                                      },
                                    },
                                  ],
                                },
                              },
                              {
                                type: "component",
                                id: "row-6c82e2cf-1ea9-464d-90de-e06bd5007c01",
                                component: {
                                  kind: "container",
                                  stackDirection: "row",
                                  styles: [
                                    { property: "alignItems", value: "end" },
                                    {
                                      property: "justifyContent",
                                      value: "end",
                                    },
                                    { property: "height", value: "100%" },
                                  ],
                                  rows: [
                                    {
                                      type: "component",
                                      id: "row-0c27f128-127e-4e50-a59a-977dcf0370af",
                                      component: {
                                        kind: "container",
                                        stackDirection: "row",
                                        styles: [
                                          {
                                            property: "padding",
                                            value: "10",
                                          },
                                        ],
                                        rows: [
                                          {
                                            type: "component",
                                            id: "row-a218684c-3af7-4b9e-af97-f9c6b899f536",
                                            component: {
                                              kind: "text",
                                              primary: {
                                                type: "static",
                                                value: "Pay now",
                                              },
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  ],
                                },
                              },
                            ],
                            styles: [],
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
  });
}

function createSectionLayoutWithWidget(): UiLayoutDocument {
  return ensureContainerRoot({
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
              id: "row-widget-embed",
              component: {
                kind: "metric-widget",
                entityName: "paymentSchedule",
                widgetId: "due-today-snapshot-mini",
                styles: [
                  { property: "maxWidth", value: "190" },
                  { property: "minWidth", value: "100" },
                ],
              } satisfies MetricWidgetComponentConfig,
            },
          ],
        },
      ],
    },
  });
}

function createPreviewShellRowWrapper(layout: UiLayoutDocument): RowWrapper {
  return (row, locator, children) => {
    const parentIsGrid = resolveParentIsGrid(layout, locator);
    const rowShell = resolveRowShellLayoutForRender({
      parentStackDirection: resolveParentStackDirection(layout, locator),
      parentStackAlign: resolveParentStackAlign(layout, locator),
      parentUsesFlexWrap: resolveParentStackUsesFlexWrap(layout, locator),
      parentStackStyles: resolveParentStackStyles(layout, locator),
      parentIsGrid,
      parentGridAlignItems: parentIsGrid
        ? resolveParentGridAlignItems(layout, locator)
        : undefined,
      row,
    });

    return (
      <div className={normalizeRuntimeRowShellClassName(rowShell.shell)}>
        <div className={normalizeRuntimeRowInnerClassName(rowShell.inner)}>
          {children}
        </div>
      </div>
    );
  };
}

function extractSnapshotMiniMarkers(html: string): string[] {
  const markers: string[] = [];

  if (html.includes("w-fit max-w-full shrink-0")) {
    markers.push("icon-content-width");
  }
  if (html.includes("items-end")) {
    markers.push("action-items-end");
  }
  if (html.includes("justify-end")) {
    markers.push("action-justify-end");
  }
  if (html.includes("self-end")) {
    markers.push("grid-track-self-end");
  }
  if (html.includes("self-stretch")) {
    markers.push("grid-track-self-stretch");
  }
  if (
    html.includes("flex min-h-0 self-stretch flex-col w-full") ||
    (html.includes("flex min-h-0 self-stretch flex-col") &&
      html.includes("w-full"))
  ) {
    markers.push("row-sibling-self-stretch");
  }
  if (html.includes("flex min-h-0 flex-1 h-full w-full min-w-0 flex-col")) {
    markers.push("percent-fill-stretch");
  }
  if (
    /flex h-full min-h-0 w-full min-w-0 flex-1 flex-col[\s\S]*grid-template-columns/.test(
      html,
    )
  ) {
    markers.push("grid-production-shell");
  }
  if (html.includes("Pay now")) {
    markers.push("pay-now-text");
  }

  return markers.sort();
}

describe("RecursiveLayoutRenderer snapshot mini parity", () => {
  const widgetLayout = createSnapshotMiniWidgetLayout();

  const widgetRenderer = () => (
    <EmbeddedLayoutRenderer
      layout={widgetLayout}
      context={listItemContext}
      inheritDesignerWrappers={false}
    />
  );

  it("matches icon width and action alignment across widget, section embed, and runtime", () => {
    const directPreviewMarkup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={widgetLayout}
        context={listItemContext}
        rowWrapper={createPreviewShellRowWrapper(widgetLayout)}
      />,
    );

    const sectionLayout = createSectionLayoutWithWidget();
    const sectionPreviewMarkup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={sectionLayout}
        context={{
          ...listItemContext,
          metricWidgetRenderer: widgetRenderer,
        }}
        rowWrapper={createPreviewShellRowWrapper(sectionLayout)}
      />,
    );

    const runtimeMarkup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={widgetLayout}
        context={listItemContext}
      />,
    );

    const directPreviewMarkers =
      extractSnapshotMiniMarkers(directPreviewMarkup);
    const sectionPreviewMarkers =
      extractSnapshotMiniMarkers(sectionPreviewMarkup);
    const runtimeMarkers = extractSnapshotMiniMarkers(runtimeMarkup);

    for (const markers of [
      directPreviewMarkers,
      sectionPreviewMarkers,
      runtimeMarkers,
    ]) {
      expect(markers).toContain("icon-content-width");
      expect(markers).toContain("action-items-end");
      expect(markers).toContain("action-justify-end");
      expect(markers).toContain("percent-fill-stretch");
      expect(markers).toContain("row-sibling-self-stretch");
      expect(markers).toContain("grid-production-shell");
      expect(markers).toContain("pay-now-text");
    }

    expect(runtimeMarkers).toContain("grid-track-self-stretch");
    expect(sectionPreviewMarkers).toEqual(runtimeMarkers);

    expect(
      runtimeMarkup.match(/items-end justify-end[\s\S]*?Pay now/),
    ).not.toBeNull();
  });
});
