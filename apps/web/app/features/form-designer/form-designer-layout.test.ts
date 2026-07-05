import type { SerializableEntityDefinition } from "@repo/entities";
import {
  createEmptyLayout,
  resolveLayoutRootColumns,
} from "@repo/ui-builder-core";
import { describe, expect, it, vi } from "vitest";

import {
  areLayoutSnapshotsEqual,
  applyLayoutSnapshotToEditor,
  getFormDesignerOuterLayout,
  readLayoutSnapshot,
  readLayoutSnapshotFromDefinition,
} from "./form-designer-layout";

const baseDefinition: SerializableEntityDefinition = {
  name: "account",
  collection: "accounts",
  permissions: ["account.read"],
  fields: {
    name: { type: "string", required: true, optional: false },
    email: { type: "string", required: false, optional: true },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["name"] }],
    forms: {
      create: { sections: [{ fields: ["name"] }] },
      edit: { sections: [{ fields: ["name"] }] },
    },
  },
};

const plainLayout = createEmptyLayout(2);
const shellLayout = createEmptyLayout(3);

describe("form-designer-layout", () => {
  it("binds plain presentation to plainLayout", () => {
    const setPlainLayout = vi.fn();
    const binding = getFormDesignerOuterLayout({
      presentation: "plain",
      plainLayout,
      setPlainLayout,
      wizard: { shellLayout, steps: [] },
      setShellLayout: vi.fn(),
    });

    expect(binding.layout).toBe(plainLayout);
    binding.setLayout(createEmptyLayout(1));
    expect(setPlainLayout).toHaveBeenCalled();
  });

  it("binds wizard presentation to shell layout", () => {
    const setShellLayout = vi.fn();
    const binding = getFormDesignerOuterLayout({
      presentation: "wizard",
      plainLayout,
      setPlainLayout: vi.fn(),
      wizard: { shellLayout, steps: [] },
      setShellLayout,
    });

    expect(binding.layout).toBe(shellLayout);
    binding.setLayout(createEmptyLayout(1));
    expect(setShellLayout).toHaveBeenCalled();
  });

  it("detects layout snapshot differences", () => {
    const left = readLayoutSnapshot(createEmptyLayout(1));
    const right = readLayoutSnapshot(createEmptyLayout(2));

    expect(areLayoutSnapshotsEqual(left, left)).toBe(true);
    expect(areLayoutSnapshotsEqual(left, right)).toBe(false);
  });

  it("falls back to a default plain layout when presentation is plain without a stored layout", () => {
    const definition: SerializableEntityDefinition = {
      ...baseDefinition,
      ui: {
        ...baseDefinition.ui,
        forms: {
          ...baseDefinition.ui.forms,
          presentation: "plain",
        },
      },
    };

    const snapshot = readLayoutSnapshotFromDefinition(definition, "plain");

    expect(resolveLayoutRootColumns(snapshot.layout).length).toBeGreaterThan(0);
  });

  it("restores layout snapshot to the active outer layout setter", () => {
    const setPlainLayout = vi.fn();
    const snapshot = readLayoutSnapshot(createEmptyLayout(4));

    applyLayoutSnapshotToEditor(
      {
        presentation: "plain",
        plainLayout,
        setPlainLayout,
        wizard: { shellLayout, steps: [] },
        setShellLayout: vi.fn(),
      },
      snapshot,
      "plain",
    );

    expect(setPlainLayout).toHaveBeenCalledWith(snapshot.layout);
  });
});
