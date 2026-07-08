import { collectLayoutFieldPaths } from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import {
  createDefaultExpandableTableView,
  reconcileExpandableTableView,
} from "./expandable-table-defaults.js";
import {
  expandableTableHasExpandContent,
  expandableTableHasExpandFieldContent,
} from "./expandable-table-runtime.js";
import { mergeEntityUiOverrides } from "./merge-entity-ui-overrides.js";
import type { SerializableEntityDefinition } from "./types.js";

const actorFields = {
  name: { type: "string", required: true, optional: false },
  type: { type: "enum", required: true, optional: false },
  logo: { type: "image", required: false, optional: true },
  website: { type: "string", required: false, optional: true },
} as const;

const actorFieldPaths = ["name", "type", "logo", "website"] as const;

describe("actor expandable table defaults", () => {
  it("uses logo as image only and keeps website in the main row", () => {
    const view = createDefaultExpandableTableView(actorFieldPaths, {
      fields: actorFields,
    });

    expect(view.imageFieldPath).toBe("logo");
    expect(
      view.columns.flatMap((column) =>
        collectLayoutFieldPaths(column.cellLayout),
      ),
    ).toEqual(["name", "type", "website"]);
    expect(expandableTableHasExpandContent()).toBe(true);
    expect(
      expandableTableHasExpandFieldContent({
        rowExpandLayout: view.rowExpandLayout,
        columns: view.columns,
        imageFieldPath: view.imageFieldPath,
      }),
    ).toBe(false);
  });

  it("migrates actor catalog ui without duplicate expand fields", () => {
    const actorDefinition: SerializableEntityDefinition = {
      name: "actor",
      collection: "actors",
      permissions: ["actor.read"],
      fields: actorFields,
      ui: {
        listViewType: "expandableTable",
        views: [
          {
            type: "table",
            name: "default",
            fields: [...actorFieldPaths],
          },
        ],
        forms: {
          create: {},
          edit: {},
        },
      },
    };

    const merged = mergeEntityUiOverrides(actorDefinition, null);
    const expandable = merged.ui.views.find(
      (view) => view.type === "expandableTable",
    );
    expect(expandable?.type).toBe("expandableTable");
    if (expandable?.type !== "expandableTable") {
      return;
    }

    expect(expandable.imageFieldPath).toBe("logo");
    expect(
      expandable.columns.flatMap((column) =>
        collectLayoutFieldPaths(column.cellLayout),
      ),
    ).toEqual(["name", "type", "website"]);
    expect(
      expandableTableHasExpandFieldContent({
        rowExpandLayout: expandable.rowExpandLayout,
        columns: expandable.columns,
        imageFieldPath: expandable.imageFieldPath,
      }),
    ).toBe(false);
  });

  it("reconciles a stale expandable view that duplicated logo and kept website in expand", () => {
    const correct = createDefaultExpandableTableView(actorFieldPaths, {
      fields: actorFields,
    });
    const staleView = {
      ...correct,
      columns: [
        {
          id: "column-0",
          label: "Name",
          cellLayout: correct.columns[0]!.cellLayout,
        },
        {
          id: "column-1",
          label: "Type",
          cellLayout: correct.columns[1]!.cellLayout,
        },
        {
          id: "column-2",
          label: "Logo",
          cellLayout: createDefaultExpandableTableView(["logo"], {
            fields: actorFields,
          }).columns[0]!.cellLayout,
        },
      ],
      rowExpandLayout: createDefaultExpandableTableView(["website"], {
        fields: actorFields,
      }).rowExpandLayout,
      imageFieldPath: "logo",
    };

    const reconciled = reconcileExpandableTableView(
      staleView,
      actorFieldPaths,
      { fields: actorFields },
    );

    expect(reconciled.imageFieldPath).toBe("logo");
    expect(
      reconciled.columns.flatMap((column) =>
        collectLayoutFieldPaths(column.cellLayout),
      ),
    ).toEqual(["name", "type", "website"]);
    expect(
      expandableTableHasExpandFieldContent({
        rowExpandLayout: reconciled.rowExpandLayout,
        columns: reconciled.columns,
        imageFieldPath: reconciled.imageFieldPath,
      }),
    ).toBe(false);
  });
});
