import type { SerializableEntityDefinition } from "@repo/entities";
import {
  removeRowAt,
  setRootColumnCount,
  setRootColumnWidthPercent,
} from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import {
  areComponentsTreeSnapshotsEqual,
  readComponentsSnapshotFromDefinition,
  readComponentsTreeSnapshotFromFull,
} from "./form-designer-components";

const baseDefinition: SerializableEntityDefinition = {
  name: "account",
  collection: "accounts",
  permissions: ["account.read"],
  fields: {
    name: { type: "string", required: true, optional: false },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["name"] }],
    forms: {
      create: { sections: [{ fields: ["name"] }] },
      edit: { sections: [{ fields: ["name"] }] },
    },
  },
};

describe("form-designer-components", () => {
  it("reads a components snapshot from the entity definition", () => {
    const snapshot = readComponentsSnapshotFromDefinition(baseDefinition);

    expect(snapshot.plainLayout.root.columnCount).toBeGreaterThan(0);
    expect(snapshot.wizard.steps.length).toBe(0);
  });

  it("ignores layout-only shell changes when comparing component trees", () => {
    const snapshot = readComponentsSnapshotFromDefinition(baseDefinition);
    const base = readComponentsTreeSnapshotFromFull(snapshot);
    const shellLayout = setRootColumnWidthPercent(
      setRootColumnCount(snapshot.plainLayout, 3),
      0,
      60,
    );
    const layoutOnly = readComponentsTreeSnapshotFromFull({
      ...snapshot,
      plainLayout: {
        ...shellLayout,
        root: {
          ...shellLayout.root,
          styles: [{ property: "gap", value: "2rem" }],
        },
      },
    });

    expect(areComponentsTreeSnapshotsEqual(base, layoutOnly)).toBe(true);
  });

  it("detects component tree row changes", () => {
    const snapshot = readComponentsSnapshotFromDefinition(baseDefinition);
    const baseTree = readComponentsTreeSnapshotFromFull(snapshot);
    const firstRow = snapshot.plainLayout.root.columns[0]?.rows[0];
    if (!firstRow) {
      throw new Error("Expected a default plain layout row");
    }

    const changed = readComponentsTreeSnapshotFromFull({
      ...snapshot,
      plainLayout: removeRowAt(
        snapshot.plainLayout,
        { scope: "root", columnIndex: 0 },
        firstRow.id,
      ),
    });

    expect(areComponentsTreeSnapshotsEqual(baseTree, changed)).toBe(false);
  });

  it("ignores trailing empty columns added from the layout tab", () => {
    const snapshot = readComponentsSnapshotFromDefinition(baseDefinition);
    const baseTree = readComponentsTreeSnapshotFromFull(snapshot);
    const withExtraEmptyColumns = readComponentsTreeSnapshotFromFull({
      ...snapshot,
      plainLayout: setRootColumnCount(snapshot.plainLayout, 3),
    });

    expect(
      areComponentsTreeSnapshotsEqual(baseTree, withExtraEmptyColumns),
    ).toBe(true);
  });
});
