import { describe, expect, it } from "vitest";

import { createDefaultMetricRowLayout } from "./create-default-metric-row-layout";
import {
  areRowLayoutSnapshotsEqual,
  readRowLayoutSnapshot,
} from "../metrics-row-designer/metrics-row-designer-snapshots";

describe("createDefaultMetricRowLayout", () => {
  it("uses stable layout ids across editor and baseline snapshots", () => {
    const editorLayout = createDefaultMetricRowLayout();
    const baselineLayout = createDefaultMetricRowLayout();

    expect(
      areRowLayoutSnapshotsEqual(
        readRowLayoutSnapshot({ metricRowLayout: editorLayout }),
        readRowLayoutSnapshot({ metricRowLayout: baselineLayout }),
      ),
    ).toBe(true);
  });
});
