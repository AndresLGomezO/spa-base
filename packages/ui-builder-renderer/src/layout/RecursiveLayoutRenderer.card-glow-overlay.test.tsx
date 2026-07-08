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

describe("card glow overlay rows", () => {
  it("renders glow overlay out of document flow without flex stretch shell", () => {
    const catalog = JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          "../../apps/api/src/admin/rates-tenant/catalogs/rates-entity-ui-overrides.json",
        ),
        "utf8",
      ),
    ) as {
      overrides: Array<{
        metricWidgets: Array<{ id: string; layout: unknown }>;
      }>;
    };

    const widget = catalog.overrides[0]?.metricWidgets.find(
      (entry) => entry.id === "income-by-month",
    );
    expect(widget).toBeDefined();

    const layout = uiLayoutDocumentSchema.parse(
      widget!.layout,
    ) as UiLayoutDocument;
    const html = renderToStaticMarkup(
      <EmbeddedLayoutRenderer layout={layout} context={minimalContext} />,
    );

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("position:absolute");
    expect(html).toMatch(
      /background(?:-color)?:(?:var\(--gradient-card-glow-success\)|linear-gradient)/,
    );
    expect(html).not.toContain(
      "flex min-h-0 flex-1 h-full w-full min-w-0 flex-col",
    );
  });
});
