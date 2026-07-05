import { resolveLayoutRootColumns } from "../layout/layout-root-adapters.js";
import { describe, expect, it } from "vitest";
import { createLayoutId } from "../builder/id.js";
import type { UiLayoutDocument } from "../types/layout.js";
import { isScreenRootNode } from "../types/layout.js";
import {
  createScreenRootNode,
  ensureScreenRootDocument,
  migrateContainerLayoutToGrid,
} from "./migrate-to-grid.js";
import { insertGridRowAt } from "../builder/mutations.js";

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
      }
    }
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
