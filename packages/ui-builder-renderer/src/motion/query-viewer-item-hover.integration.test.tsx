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

function findRowById(
  rows: readonly ComponentRowNode[] | undefined,
  rowId: string,
): ComponentRowNode | undefined {
  for (const row of rows ?? []) {
    if (row.id === rowId) {
      return row;
    }
    if (row.type === "component" && row.component?.kind === "container") {
      const nested = findRowById(row.component.rows, rowId);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
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
    expect(itemRow.motion?.hoverSurface).toBe("glow-border");

    const motion = resolveMotionPreset(itemRow.motion);
    expect(motion.className).toContain("ui-motion-hover-interactive");
    expect(motion.className).toContain("ui-motion-hover-glow-border");

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
    expect(html).toContain("ui-motion-hover-glow-border");
  });

  it("renders tinted mini-widget action buttons with rest/hover background vars", () => {
    const json = readFileSync(
      join(
        process.cwd(),
        "../../.local/tenant-import/ui/paymentSchedule-entity-ui-overrides.json",
      ),
      "utf8",
    );
    const catalog = JSON.parse(json) as {
      overrides: Array<{
        metricWidgets: Array<{ id: string; layout: unknown }>;
      }>;
    };
    const widget = catalog.overrides[0]?.metricWidgets.find(
      (entry) => entry.id === "due-today-snapshot-mini",
    );
    expect(widget).toBeDefined();

    const parsed = uiLayoutDocumentSchema.parse(widget!.layout);
    const rootRows =
      parsed.root.type === "root"
        ? ((parsed.root.columns[0]?.rows ?? []) as readonly ComponentRowNode[])
        : [];
    const actionRow = findRowById(
      rootRows,
      "row-due-today-snapshot-mini-action",
    ) as ComponentRowNode & { motion?: MotionPreset };
    expect(actionRow?.motion?.hoverSurface).toBe("destructive");

    const actionLayout: UiLayoutDocument = {
      root: {
        type: "root",
        id: "mini-action-root",
        columnCount: 1,
        columns: [
          {
            id: "mini-action-col",
            rows: [actionRow!],
          },
        ],
      },
    };

    const html = renderToStaticMarkup(
      <EmbeddedLayoutRenderer layout={actionLayout} context={minimalContext} />,
    );

    expect(html).toContain("ui-motion-hover-interactive");
    expect(html).toContain("--motion-rest-bg");
    expect(html).toContain("--motion-hover-bg");
    expect(html).not.toMatch(/background-color:color-mix/);
  });

  it("renders See all text links with interactive hover on the row wrapper", () => {
    const json = readFileSync(
      join(
        process.cwd(),
        "../../apps/api/src/admin/rates-tenant/catalogs/rates-entity-ui-overrides.json",
      ),
      "utf8",
    );
    const catalog = JSON.parse(json) as {
      overrides: Array<{
        metricWidgets: Array<{ id: string; layout: unknown }>;
      }>;
    };
    const transactionOverride = catalog.overrides.find((entry) =>
      entry.metricWidgets?.some(
        (widget) => widget.id === "recent-activity-transactions",
      ),
    );
    const widget = transactionOverride?.metricWidgets.find(
      (entry) => entry.id === "recent-activity-transactions",
    );
    expect(widget).toBeDefined();

    const parsed = uiLayoutDocumentSchema.parse(widget!.layout);
    const rootRows =
      parsed.root.type === "root"
        ? ((parsed.root.columns[0]?.rows ?? []) as readonly ComponentRowNode[])
        : [];
    const seeAllRow = findRowById(
      rootRows,
      "row-recent-activity-see-all",
    ) as ComponentRowNode & { motion?: MotionPreset };
    expect(seeAllRow?.motion?.hoverSurface).toBe("default");

    const seeAllLayout: UiLayoutDocument = {
      root: {
        type: "root",
        id: "see-all-root",
        columnCount: 1,
        columns: [
          {
            id: "see-all-col",
            rows: [seeAllRow!],
          },
        ],
      },
    };

    const html = renderToStaticMarkup(
      <EmbeddedLayoutRenderer layout={seeAllLayout} context={minimalContext} />,
    );

    expect(html).toContain("ui-motion-hover-interactive");
    expect(html).toContain("--motion-hover-bg");
    expect(html).toContain("padding-top:4px");
    expect(html).toContain("border-radius:8px");
  });
});
