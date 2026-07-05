import { describe, expect, it } from "vitest";
import {
  asEditableLayoutRoot,
  resolveLayoutRootColumns,
  withEditableRootColumns,
} from "@repo/ui-builder-core";

import {
  createDefaultMetricStripLayout,
  metricStripHasContent,
} from "./metric-strip-placement.js";

describe("metric strip helpers", () => {
  it("creates empty shell layout with column count", () => {
    const layout = createDefaultMetricStripLayout(3);
    expect(asEditableLayoutRoot(layout.root).columnCount).toBe(3);
    expect(resolveLayoutRootColumns(layout)).toHaveLength(3);
    expect(
      resolveLayoutRootColumns(layout).every((col) => col.rows.length === 0),
    ).toBe(true);
  });

  it("metricStripHasContent is false for empty columns", () => {
    expect(metricStripHasContent(createDefaultMetricStripLayout(4))).toBe(
      false,
    );
    expect(metricStripHasContent(undefined)).toBe(false);
  });

  it("metricStripHasContent is true when any column has rows", () => {
    const empty = createDefaultMetricStripLayout(2);
    const layout = withEditableRootColumns(empty, (rootColumns) => [
      {
        ...rootColumns[0]!,
        rows: [
          {
            type: "component" as const,
            id: "row-1",
            component: {
              kind: "metric-kpi" as const,
              metricDefinitionId: "m1",
              groupBindings: {},
              dimensionBindings: {},
            },
          },
        ],
      },
      ...rootColumns.slice(1),
    ]);
    expect(metricStripHasContent(layout)).toBe(true);
  });
});
