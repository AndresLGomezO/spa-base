import { describe, expect, it } from "vitest";

import { toComponentRowRef } from "../form-designer/form-designer-component-row-ref.js";
import { resolveStructurePanelTargetId } from "./resolve-structure-panel-target-id.js";

describe("resolveStructurePanelTargetId", () => {
  it("returns row id for row targets", () => {
    const layout = {
      root: {
        type: "root" as const,
        id: "root",
        columnCount: 1,
        columns: [
          {
            id: "col-1",
            rows: [
              {
                type: "component" as const,
                id: "row-greetings-actions",
                component: {
                  kind: "text" as const,
                  primary: { type: "static" as const, value: "Hi" },
                },
              },
            ],
          },
        ],
      },
    };

    expect(
      resolveStructurePanelTargetId(layout, {
        kind: "row",
        rowRef: toComponentRowRef("row-greetings-actions", {
          scope: "root",
          columnIndex: 0,
        }),
      }),
    ).toBe("row-greetings-actions");
  });

  it("returns column id for column targets", () => {
    const layout = {
      root: {
        type: "root" as const,
        id: "root",
        columnCount: 1,
        columns: [
          {
            id: "col-greetings",
            rows: [],
          },
        ],
      },
    };

    expect(
      resolveStructurePanelTargetId(layout, {
        kind: "column",
        columnRef: { rootColumnIndex: 0 },
      }),
    ).toBe("col-greetings");
  });

  it("returns grouped column id by index", () => {
    expect(
      resolveStructurePanelTargetId(
        {
          root: {
            type: "root",
            id: "root",
            columnCount: 1,
            columns: [{ id: "col-1", rows: [] }],
          },
        },
        { kind: "groupedColumn", columnIndex: 1 },
        {
          groupedColumnIds: [{ id: "grouped-col-0" }, { id: "grouped-col-1" }],
        },
      ),
    ).toBe("grouped-col-1");
  });

  it("returns root layout column id by index", () => {
    const layout = {
      root: {
        type: "root" as const,
        id: "root-doc",
        columnCount: 2,
        columns: [
          { id: "col-left", rows: [] },
          { id: "col-right", rows: [] },
        ],
      },
    };

    expect(
      resolveStructurePanelTargetId(layout, {
        kind: "rootLayoutColumn",
        columnIndex: 1,
      }),
    ).toBe("col-right");
  });

  it("returns root layout id", () => {
    expect(
      resolveStructurePanelTargetId(
        {
          root: {
            type: "root" as const,
            id: "root-doc",
            columnCount: 1,
            columns: [{ id: "col-1", rows: [] }],
          },
        },
        { kind: "rootLayout" },
      ),
    ).toBe("root-doc");
  });
});
