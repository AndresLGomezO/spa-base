/** @vitest-environment jsdom */

import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { formatCurrentDateBucket } from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { PreviewBreakpointProvider } from "../preview-breakpoint-context.js";
import { RecursiveLayoutRenderer } from "./RecursiveLayoutRenderer.js";

const currentPeriodRules = [
  {
    conditionKind: "dashboardDateFilter" as const,
    matchValue: "currentPeriod",
  },
];

function gatedLayout(options?: {
  readonly displayFrom?: "md";
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
          id: "row-gated",
          ...(options?.displayFrom ? { displayFrom: options.displayFrom } : {}),
          visibleWhen: currentPeriodRules,
          component: {
            kind: "text",
            primary: { type: "static", value: "Gated content" },
          },
        },
      ],
    },
  };
}

describe("RecursiveLayoutRenderer visibleWhen", () => {
  it("renders when dashboard filter matches current period", () => {
    const context: LayoutRenderContext = {
      mode: "mainPage",
      data: {},
      locale: "en",
      dashboardDateFilter: {
        value: formatCurrentDateBucket("month"),
        granularity: "month",
      },
      resolveField: () => undefined,
    };

    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer layout={gatedLayout()} context={context} />,
    );

    expect(html).toContain("Gated content");
  });

  it("returns null (unmounts) when filter is not current period", () => {
    const context: LayoutRenderContext = {
      mode: "mainPage",
      data: {},
      locale: "en",
      dashboardDateFilter: {
        value: "1999-01",
        granularity: "month",
      },
      resolveField: () => undefined,
    };

    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer layout={gatedLayout()} context={context} />,
    );

    expect(html).not.toContain("Gated content");
  });

  it("renders when dashboard date filter is absent", () => {
    const context: LayoutRenderContext = {
      mode: "mainPage",
      data: {},
      locale: "en",
      resolveField: () => undefined,
    };

    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer layout={gatedLayout()} context={context} />,
    );

    expect(html).toContain("Gated content");
  });

  it("still applies display range when visibleWhen passes", () => {
    const context: LayoutRenderContext = {
      mode: "mainPage",
      data: {},
      locale: "en",
      dashboardDateFilter: {
        value: formatCurrentDateBucket("month"),
        granularity: "month",
      },
      resolveField: () => undefined,
    };

    const html = renderToStaticMarkup(
      <PreviewBreakpointProvider breakpoint="sm">
        <RecursiveLayoutRenderer
          layout={gatedLayout({ displayFrom: "md" })}
          context={context}
        />
      </PreviewBreakpointProvider>,
    );

    expect(html).toContain("Gated content");
    expect(html).toContain("hidden");
  });

  it("unmounts via visibleWhen even when display range would show", () => {
    const context: LayoutRenderContext = {
      mode: "mainPage",
      data: {},
      locale: "en",
      dashboardDateFilter: {
        value: "1999-01",
        granularity: "month",
      },
      resolveField: () => undefined,
    };

    const html = renderToStaticMarkup(
      <PreviewBreakpointProvider breakpoint="xl">
        <RecursiveLayoutRenderer
          layout={gatedLayout({ displayFrom: "md" })}
          context={context}
        />
      </PreviewBreakpointProvider>,
    );

    expect(html).not.toContain("Gated content");
  });
});
