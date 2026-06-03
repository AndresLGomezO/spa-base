import { createDefaultExpandableTableView, defineEntity } from "@repo/entities";
import { describe, expect, it } from "vitest";

import {
  buildInitialValues,
  buildListQueryConfig,
  filterNavEntities,
  getFormSections,
  getExpandableTableColumns,
  getExpandableTableRowExpandLayout,
  getExpandableTableShowActions,
  getListToolbarFields,
  getTableColumns,
  getTableViewShowActions,
  registerComponent,
  resolveComponentId,
  resolveCreateForm,
  resolveEntityActionPermissions,
} from "./index.js";

const Widget = defineEntity({
  name: "widget",
  fields: {
    name: { type: "string", required: true },
    isActive: { type: "boolean", default: true },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["name", "isActive"] }],
    forms: {
      create: { sections: [{ fields: ["name", "isActive"] }] },
      edit: { sections: [{ fields: ["name", "isActive"] }] },
    },
    fields: {
      isActive: { order: 0 },
      name: { order: 1 },
    },
  },
});

const definition = {
  name: "widget",
  collection: "widgets",
  permissions: [
    "widget.read",
    "widget.create",
    "widget.update",
    "widget.delete",
  ],
  fields: {
    name: { type: "string", required: true, optional: false },
    isActive: {
      type: "boolean",
      required: false,
      optional: true,
      default: true,
    },
  },
  ui: Widget.metadata.ui!,
};

describe("@repo/ui-builder", () => {
  it("resolves table columns in view field order", () => {
    expect(getTableColumns(definition)).toEqual(["name", "isActive"]);
  });

  it("resolves expandable table view config", () => {
    const expandable = createDefaultExpandableTableView(["name", "isActive"]);
    const withExpandable = {
      ...definition,
      ui: {
        ...definition.ui,
        listViewType: "expandableTable" as const,
        views: [definition.ui.views[0]!, expandable],
      },
    };

    expect(getExpandableTableColumns(withExpandable).length).toBeGreaterThan(0);
    expect(getExpandableTableRowExpandLayout(withExpandable)).toBeDefined();
    expect(getExpandableTableShowActions(withExpandable)).toBe(true);
    expect(getListToolbarFields(withExpandable)).toEqual(["name", "isActive"]);
  });

  it("resolves table showActions from view config", () => {
    expect(getTableViewShowActions(definition)).toBe(true);
    const hidden = {
      ...definition,
      ui: {
        ...definition.ui,
        views: [
          {
            type: "table" as const,
            name: "default",
            fields: ["name"],
            showActions: false,
          },
        ],
      },
    };
    expect(getTableViewShowActions(hidden)).toBe(false);
  });

  it("sorts form sections by field order metadata", () => {
    expect(
      getFormSections(definition.ui.forms.create, definition.ui.fields),
    ).toEqual([{ fields: ["isActive", "name"] }]);
  });

  it("builds initial form values from metadata", () => {
    expect(buildInitialValues(definition, "create")).toEqual({
      name: "",
      isActive: true,
    });
  });

  it("builds query config for filters and sort", () => {
    const config = buildListQueryConfig({
      filters: [{ field: "name", operator: "==", value: "Acme" }],
      sort: { field: "name", direction: "asc" },
      limit: 10,
    });
    expect(config.filter).toHaveLength(1);
    expect(config.sort).toEqual([{ field: "name", direction: "asc" }]);
    expect(config.pagination?.limit).toBe(10);
  });

  it("filters nav entities by read permission", () => {
    const visible = filterNavEntities([definition], ["widget.read"]);
    expect(visible).toHaveLength(1);
    expect(filterNavEntities([definition], [])).toHaveLength(0);
  });

  it("resolves entity action permissions", () => {
    expect(
      resolveEntityActionPermissions("widget", [
        "widget.read",
        "widget.create",
      ]),
    ).toMatchObject({
      canRead: true,
      canCreate: true,
      canUpdate: false,
      canDelete: false,
    });
  });

  it("includes entity fields missing from the saved create form layout", () => {
    const layout = resolveCreateForm({
      ...definition,
      fields: {
        ...definition.fields,
        statement: { type: "document", required: false, optional: true },
      },
      ui: {
        ...definition.ui,
        forms: {
          create: { sections: [{ fields: ["name", "isActive"] }] },
          edit: { sections: [{ fields: ["name", "isActive"] }] },
        },
      },
    });

    expect(layout.sections[0]?.fields).toEqual([
      "name",
      "isActive",
      "statement",
    ]);
  });

  it("supports custom component registration", () => {
    registerComponent("richText", "RichTextEditor");
    expect(resolveComponentId("richText", "string")).toBe("RichTextEditor");
  });
});
