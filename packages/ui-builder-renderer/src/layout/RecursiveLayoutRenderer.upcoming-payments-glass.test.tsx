/** @vitest-environment jsdom */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  uiLayoutDocumentSchema,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { EmbeddedLayoutRenderer } from "./EmbeddedLayoutRenderer.js";

vi.mock("@visx/responsive", () => ({
  ParentSize: ({
    children,
  }: {
    readonly children: (size: {
      readonly width: number;
      readonly height: number;
    }) => unknown;
  }) => children({ width: 320, height: 160 }),
}));

const minimalContext: LayoutRenderContext = {
  mode: "listItem",
  data: {},
  locale: "en",
  resolveField: () => undefined,
};

function loadWidget(catalogPath: string, widgetId: string) {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as {
    overrides: Array<{
      metricWidgets?: Array<{ id: string; layout: unknown }>;
    }>;
  };
  const widget = catalog.overrides
    .flatMap((override) => override.metricWidgets ?? [])
    .find((entry) => entry.id === widgetId);
  if (!widget) {
    throw new Error(`Widget ${widgetId} not found in ${catalogPath}`);
  }
  return uiLayoutDocumentSchema.parse(widget.layout) as UiLayoutDocument;
}

describe("upcoming payments glass card", () => {
  it("renders glass surface styles on the card shell", () => {
    const layout = loadWidget(
      join(
        process.cwd(),
        "../../apps/api/src/admin/rates-tenant/__fixtures__/local-ui-slices/paymentSchedule-entity-ui-overrides.json",
      ),
      "upcoming-payments-dashboard",
    );

    const html = renderToStaticMarkup(
      <EmbeddedLayoutRenderer layout={layout} context={minimalContext} />,
    );

    expect(html).toContain("backdrop-filter:var(--backdrop-filter-card)");
    expect(html).toContain("background-color:var(--color-card)");
    expect(html).toContain("box-shadow:var(--shadow-card)");
    expect(html).toMatch(
      /background(?:-color)?:var\(--gradient-card-glow-neutral\)/,
    );
  });
});
