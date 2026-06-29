/** @vitest-environment jsdom */

import {
  ensureContainerRoot,
  normalizeRuntimeRowInnerClassName,
  normalizeRuntimeRowShellClassName,
  resolveParentStackAlign,
  resolveParentStackDirection,
  resolveParentStackStyles,
  resolveParentStackUsesFlexWrap,
  resolveRowShellLayoutForRender,
  type DashboardSectionComponentConfig,
  type MetricWidgetComponentConfig,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import type { RowWrapper } from "./layout-wrapper-types.js";
import { RecursiveLayoutRenderer } from "./RecursiveLayoutRenderer.js";

const listItemContext: LayoutRenderContext = {
  mode: "listItem",
  data: {},
  locale: "en",
  resolveField: () => undefined,
};

function createFlexWrapDashboardLayout(): UiLayoutDocument {
  return ensureContainerRoot({
    showActions: true,
    root: {
      type: "root",
      id: "root-dashboard",
      columnCount: 1,
      columns: [
        {
          id: "col-dashboard",
          stackDirection: "row",
          styles: [{ property: "flexWrap", value: "wrap" }],
          rows: [
            {
              type: "component",
              id: "row-widget",
              component: {
                kind: "metric-widget",
                entityName: "transaction",
                widgetId: "widget-1",
                styles: [{ property: "flex", value: "0" }],
              } satisfies MetricWidgetComponentConfig,
            },
            {
              type: "component",
              id: "row-section",
              component: {
                kind: "dashboard-section",
                sectionId: "section-1",
                styles: [{ property: "flex", value: "0" }],
              } satisfies DashboardSectionComponentConfig,
            },
          ],
        },
      ],
    },
  });
}

function createPreviewShellRowWrapper(layout: UiLayoutDocument): RowWrapper {
  return (row, locator, children) => {
    const rowShell = resolveRowShellLayoutForRender({
      parentStackDirection: resolveParentStackDirection(layout, locator),
      parentStackAlign: resolveParentStackAlign(layout, locator),
      parentUsesFlexWrap: resolveParentStackUsesFlexWrap(layout, locator),
      parentStackStyles: resolveParentStackStyles(layout, locator),
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

describe("RecursiveLayoutRenderer dashboard layout parity", () => {
  it("uses content-width shell layers for flex-zero widgets and sections at runtime", () => {
    const markup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={createFlexWrapDashboardLayout()}
        context={{
          ...listItemContext,
          metricWidgetRenderer: () => (
            <div className="min-w-0 w-fit max-w-full shrink-0">Widget</div>
          ),
          dashboardSectionRenderer: () => (
            <div className="min-w-0 w-fit max-w-full shrink-0">Section</div>
          ),
        }}
      />,
    );

    expect(markup).toContain("w-fit max-w-full");
    expect(markup).toMatch(
      /flex min-h-0 min-w-0 w-fit max-w-full shrink-0 flex-col"><div class="flex min-h-0 min-w-0 flex-col"><div class="[^"]*"><div class="min-w-0 w-fit max-w-full shrink-0">Widget<\/div>/,
    );
    expect(markup).toMatch(
      /flex min-h-0 min-w-0 w-fit max-w-full shrink-0 flex-col"><div class="flex min-h-0 min-w-0 flex-col"><div class="[^"]*"><div class="min-w-0 w-fit max-w-full shrink-0">Section<\/div>/,
    );
    expect(markup).not.toMatch(
      /flex min-h-0 min-w-0 w-fit max-w-full shrink-0 flex-col[^"]*flex w-full items-start/,
    );
  });

  it("uses a neutral root shell without w-full for listItem dashboards", () => {
    const markup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={createFlexWrapDashboardLayout()}
        context={listItemContext}
      />,
    );

    expect(markup).toMatch(/^<div class="flex min-w-0 flex-col">/);
  });

  it("matches preview shell layering for flex-wrap widget rows", () => {
    const layout = createFlexWrapDashboardLayout();
    const context = {
      ...listItemContext,
      metricWidgetRenderer: () => (
        <div className="min-w-0 w-fit max-w-full shrink-0">Widget</div>
      ),
      dashboardSectionRenderer: () => (
        <div className="min-w-0 w-fit max-w-full shrink-0">Section</div>
      ),
    };

    const productionMarkup = renderToStaticMarkup(
      <RecursiveLayoutRenderer layout={layout} context={context} />,
    );

    const previewMarkup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={layout}
        context={context}
        rowWrapper={createPreviewShellRowWrapper(layout)}
      />,
    );

    for (const markup of [productionMarkup, previewMarkup]) {
      expect(markup).toContain(
        "flex min-h-0 min-w-0 w-fit max-w-full shrink-0 flex-col",
      );
      expect(markup).toContain("flex min-h-0 min-w-0 flex-col");
      expect(markup).toMatch(/w-fit max-w-full min-w-0 shrink-0 grow-0/);
    }
  });
});
