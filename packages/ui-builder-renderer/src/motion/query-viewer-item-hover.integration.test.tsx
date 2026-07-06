/** @vitest-environment jsdom */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type ComponentRowNode,
  type MotionPreset,
  type UiLayoutDocument,
  uiLayoutDocumentSchema,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { EmbeddedLayoutRenderer } from "../layout/EmbeddedLayoutRenderer.js";
import { resolveMotionPreset } from "./resolve-motion.js";

const minimalContext: LayoutRenderContext = {
  mode: "listItem",
  data: {},
  locale: "en",
  resolveField: () => undefined,
};

function findQueryViewerComponent(
  rows: readonly ComponentRowNode[],
): { readonly rows: readonly ComponentRowNode[] } | undefined {
  for (const row of rows) {
    if (row.component?.kind === "query-viewer") {
      return row.component as { readonly rows: readonly ComponentRowNode[] };
    }
    if (row.component?.kind === "container" && row.component.rows) {
      const nested = findQueryViewerComponent(row.component.rows);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
}

function motionStyleVar(
  style: ReturnType<typeof resolveMotionPreset>["style"],
  key: string,
): string | undefined {
  if (!style) {
    return undefined;
  }

  return (style as Record<string, string | undefined>)[key];
}

describe("query viewer item row hover", () => {
  it("preserves hoverSurface on the payment item template row and renders interactive hover", () => {
    const json = readFileSync(
      join(
        process.cwd(),
        "../../.local/tenant-import/ui/paymentSchedule-entity-ui-overrides.json",
      ),
      "utf8",
    );
    const catalog = JSON.parse(json) as {
      overrides: Array<{
        metricWidgets: Array<{ layout: unknown }>;
      }>;
    };
    const widget = catalog.overrides[0]?.metricWidgets[0];
    expect(widget).toBeDefined();

    const parsed = uiLayoutDocumentSchema.parse(widget!.layout);
    const rootRows =
      parsed.root.type === "root"
        ? ((parsed.root.columns[0]?.rows ?? []) as readonly ComponentRowNode[])
        : [];
    const queryViewer = findQueryViewerComponent(rootRows);
    expect(queryViewer).toBeDefined();

    const itemRow = queryViewer!.rows[0] as ComponentRowNode & {
      motion?: MotionPreset;
    };
    expect(itemRow.motion?.hoverSurface).toBe("default");

    const motion = resolveMotionPreset(itemRow.motion);
    expect(motion.className).toContain("ui-motion-hover-interactive");
    expect(motionStyleVar(motion.style, "--motion-hover-bg")).toBe(
      "var(--color-hover)",
    );

    const itemLayout: UiLayoutDocument = {
      root: {
        type: "root",
        id: "query-viewer-item-root",
        columnCount: 1,
        columns: [
          {
            id: "query-viewer-item-col",
            rows: [...queryViewer!.rows],
          },
        ],
      },
    };

    const html = renderToStaticMarkup(
      <EmbeddedLayoutRenderer layout={itemLayout} context={minimalContext} />,
    );

    expect(html).toContain("ui-motion-hover-interactive");
    expect(html).toContain("--motion-hover-bg");
  });
});
