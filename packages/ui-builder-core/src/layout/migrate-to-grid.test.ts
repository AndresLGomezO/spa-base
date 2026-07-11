import { resolveLayoutRootColumns } from "../layout/layout-root-adapters.js";
import { describe, expect, it } from "vitest";
import { createLayoutId } from "../builder/id.js";
import type { UiLayoutDocument } from "../types/layout.js";
import { isScreenRootNode } from "../types/layout.js";
import {
  createScreenRootNode,
  ensureAppShellScreenRoot,
  ensureScreenRootDocument,
  migrateContainerLayoutToGrid,
} from "./migrate-to-grid.js";
import { insertGridRowAt } from "../builder/mutations.js";
import { isContainerComponent } from "../types/component.js";

describe("migrateContainerLayoutToGrid", () => {
  it("converts container with rows to grid component", () => {
    const layout: UiLayoutDocument = {
      root: {
        type: "root",
        id: createLayoutId("root"),
        columnCount: 1,
        columns: [
          {
            id: createLayoutId("col"),
            rows: [
              {
                type: "component",
                id: createLayoutId("row"),
                component: {
                  kind: "container",
                  rows: [
                    {
                      type: "component",
                      id: createLayoutId("row"),
                      component: {
                        kind: "text",
                        primary: { type: "field", path: "name" },
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    const migrated = migrateContainerLayoutToGrid(layout);
    const row = resolveLayoutRootColumns(migrated)[0]?.rows[0];
    expect(row?.type).toBe("component");
    if (row?.type === "component") {
      expect(row.component.kind).toBe("grid");
      if (row.component.kind === "grid") {
        expect(row.component.gridTemplateColumns).toBe("1fr");
        expect(row.component.rows).toHaveLength(1);
        const track = row.component.rows[0];
        expect(track?.type).toBe("component");
        if (track?.type === "component") {
          expect(track.component.kind).toBe("container");
          if (track.component.kind === "container") {
            expect(track.component.rows).toHaveLength(1);
            expect(track.component.rows[0]?.component.kind).toBe("text");
          }
        }
      }
    }
  });

  it("wraps leaf grid tracks in containers so inserts remain possible", () => {
    const layout: UiLayoutDocument = {
      root: createScreenRootNode([
        {
          type: "component",
          id: "header-bar",
          name: "Header",
          component: {
            kind: "grid",
            gridTemplateColumns: "1fr",
            rows: [
              {
                type: "component",
                id: "header-sidebar-trigger",
                name: "Menu",
                component: {
                  kind: "sidebar-trigger",
                  iconName: "PanelLeft",
                },
              },
            ],
          },
        },
      ]),
    };

    const migrated = migrateContainerLayoutToGrid(layout);
    expect(isScreenRootNode(migrated.root)).toBe(true);
    if (!isScreenRootNode(migrated.root)) {
      return;
    }

    const header = migrated.root.rows[0];
    expect(header?.type).toBe("component");
    if (header?.type !== "component" || header.component.kind !== "grid") {
      throw new Error("expected header grid");
    }

    const track = header.component.rows[0];
    expect(track?.type).toBe("component");
    if (track?.type !== "component" || track.component.kind !== "container") {
      throw new Error("expected container track");
    }

    expect(track.component.rows).toHaveLength(1);
    expect(track.component.rows[0]?.component.kind).toBe("sidebar-trigger");
  });

  it("creates screen root with single column grid template", () => {
    const root = createScreenRootNode();
    expect(root.type).toBe("screen-root");
    expect(root.gridTemplateColumns).toBe("1fr");
  });

  it("ensures screen scope documents use screen-root", () => {
    const layout: UiLayoutDocument = {
      root: {
        type: "root",
        id: createLayoutId("root"),
        columnCount: 1,
        columns: [{ id: createLayoutId("col"), rows: [] }],
      },
    };

    const result = ensureScreenRootDocument(layout);
    expect(isScreenRootNode(result.root)).toBe(true);
  });

  it("leaves existing grid rows unchanged", () => {
    const { layout, rowId } = insertGridRowAt(
      {
        root: {
          type: "root",
          id: createLayoutId("root"),
          columnCount: 1,
          columns: [{ id: createLayoutId("col"), rows: [] }],
        },
      },
      { scope: "root", columnIndex: 0 },
      { position: "after" },
      { trackCount: 2 },
    );

    const migrated = migrateContainerLayoutToGrid(layout);
    const row = resolveLayoutRootColumns(migrated)[0]?.rows[0];
    expect(row?.type).toBe("component");
    if (row?.type === "component") {
      expect(row.component.kind).toBe("grid");
      if (row.component.kind === "grid") {
        expect(row.component.rows).toHaveLength(2);
        expect(
          row.component.rows.every((track) => track.type === "component"),
        ).toBe(true);
        if (row.component.rows[0]?.type === "component") {
          expect(row.component.rows[0].component.kind).toBe("container");
        }
      }
    }
    expect(rowId).toBeTruthy();
  });
});

describe("ensureAppShellScreenRoot", () => {
  it("keeps non-empty nested containers as containers (no container→grid)", () => {
    const layout: UiLayoutDocument = {
      root: createScreenRootNode([
        {
          type: "component",
          id: "sidebar-shell",
          name: "Sidebar",
          component: {
            kind: "container",
            stackDirection: "column",
            rows: [
              {
                type: "component",
                id: "sidebar-header",
                name: "Header",
                component: {
                  kind: "container",
                  stackDirection: "column",
                  rows: [
                    {
                      type: "component",
                      id: "sidebar-logo",
                      component: {
                        kind: "image",
                        primary: { type: "static", value: "" },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ]),
    };

    const result = ensureAppShellScreenRoot(layout);
    expect(isScreenRootNode(result.root)).toBe(true);
    if (!isScreenRootNode(result.root)) {
      return;
    }

    const shell = result.root.rows[0];
    expect(shell?.type).toBe("component");
    if (shell?.type !== "component") {
      return;
    }
    expect(isContainerComponent(shell.component)).toBe(true);
    if (!isContainerComponent(shell.component)) {
      return;
    }

    const header = shell.component.rows[0];
    expect(header?.type).toBe("component");
    if (header?.type !== "component") {
      return;
    }
    expect(header.component.kind).toBe("container");
  });

  it("converts legacy column root to screen-root without migrating containers", () => {
    const layout: UiLayoutDocument = {
      root: {
        type: "root",
        id: createLayoutId("root"),
        columnCount: 1,
        columns: [
          {
            id: createLayoutId("col"),
            rows: [
              {
                type: "component",
                id: "app-header-bar",
                component: {
                  kind: "container",
                  stackDirection: "row",
                  rows: [
                    {
                      type: "component",
                      id: "header-sidebar-trigger",
                      component: {
                        kind: "sidebar-trigger",
                        iconName: "PanelLeft",
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    const result = ensureAppShellScreenRoot(layout);
    expect(isScreenRootNode(result.root)).toBe(true);
    if (!isScreenRootNode(result.root)) {
      return;
    }

    const bar = result.root.rows[0];
    expect(bar?.type).toBe("component");
    if (bar?.type !== "component") {
      return;
    }
    expect(bar.component.kind).toBe("container");
    if (!isContainerComponent(bar.component)) {
      return;
    }
    expect(bar.component.rows[0]?.component.kind).toBe("sidebar-trigger");
  });
});
