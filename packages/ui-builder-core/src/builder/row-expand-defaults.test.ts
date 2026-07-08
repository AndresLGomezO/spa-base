import { resolveLayoutRootColumns } from "../layout/layout-root-adapters.js";
import { describe, expect, it } from "vitest";

import { isContainerComponent, isGridComponent } from "../types/component.js";
import {
  createDefaultRowExpandLayout,
  isRowExpandContainerRootLayout,
} from "./row-expand-defaults.js";

describe("createDefaultRowExpandLayout", () => {
  it("creates a root container with a 3-column grid and default field components", () => {
    const layout = createDefaultRowExpandLayout([
      "name",
      "balance",
      "status",
      "notes",
    ]);

    expect(isRowExpandContainerRootLayout(layout)).toBe(true);

    const rootColumn = resolveLayoutRootColumns(layout)[0];
    expect(rootColumn?.rows).toHaveLength(1);

    const containerRow = rootColumn?.rows[0];
    expect(containerRow?.type).toBe("component");
    if (
      containerRow?.type !== "component" ||
      !isContainerComponent(containerRow.component)
    ) {
      return;
    }

    expect(containerRow.component.rows).toHaveLength(1);

    const gridRow = containerRow.component.rows[0];
    expect(gridRow?.type).toBe("component");
    if (gridRow?.type !== "component" || !isGridComponent(gridRow.component)) {
      return;
    }

    expect(gridRow.component.rows).toHaveLength(3);
    const fieldCounts = gridRow.component.rows.map((track) => {
      if (
        track.type !== "component" ||
        !isContainerComponent(track.component)
      ) {
        return 0;
      }
      return track.component.rows.length;
    });
    expect(fieldCounts).toEqual([2, 1, 1]);
  });

  it("adds relation click actions for many-to-one fields", () => {
    const layout = createDefaultRowExpandLayout(["accountId"], {
      accountId: { type: "many-to-one" },
    });

    const rootColumn = resolveLayoutRootColumns(layout)[0];
    const containerRow = rootColumn?.rows[0];
    if (
      containerRow?.type !== "component" ||
      !isContainerComponent(containerRow.component)
    ) {
      return;
    }

    const gridRow = containerRow.component.rows[0];
    if (gridRow?.type !== "component" || !isGridComponent(gridRow.component)) {
      return;
    }

    const firstTrack = gridRow.component.rows[0];
    if (
      firstTrack?.type !== "component" ||
      !isContainerComponent(firstTrack.component)
    ) {
      return;
    }

    const fieldRow = firstTrack.component.rows[0];
    expect(fieldRow?.clickAction).toEqual({
      type: "entityRecord",
      target: { relationFieldPath: "accountId" },
    });
  });

  it("shows field labels in expand rows by default", () => {
    const layout = createDefaultRowExpandLayout(["notes"]);
    const rootColumn = resolveLayoutRootColumns(layout)[0];
    const containerRow = rootColumn?.rows[0];
    if (
      containerRow?.type !== "component" ||
      !isContainerComponent(containerRow.component)
    ) {
      return;
    }

    const gridRow = containerRow.component.rows[0];
    if (gridRow?.type !== "component" || !isGridComponent(gridRow.component)) {
      return;
    }

    const firstTrack = gridRow.component.rows[0];
    if (
      firstTrack?.type !== "component" ||
      !isContainerComponent(firstTrack.component)
    ) {
      return;
    }

    const fieldRow = firstTrack.component.rows[0];
    if (fieldRow?.type !== "component" || fieldRow.component.kind !== "text") {
      return;
    }

    expect(fieldRow.component.label).toEqual({ show: true });
  });
});
