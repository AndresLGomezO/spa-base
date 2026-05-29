import { defineEntity } from "@repo/entities";
import { describe, expect, it } from "vitest";

import {
  buildInitialValues,
  buildListQueryConfig,
  filterNavEntities,
  getTableColumns,
  registerComponent,
  resolveComponentId,
  resolveEntityActionPermissions,
} from "./index.js";

const Organization = defineEntity({
  name: "organization",
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
  },
});

const definition = {
  name: "organization",
  collection: "organizations",
  permissions: [
    "organization.read",
    "organization.create",
    "organization.update",
    "organization.delete",
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
  ui: Organization.metadata.ui!,
};

describe("@repo/ui-builder", () => {
  it("resolves table columns from view config", () => {
    expect(getTableColumns(definition)).toEqual(["name", "isActive"]);
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
    const visible = filterNavEntities([definition], ["organization.read"]);
    expect(visible).toHaveLength(1);
    expect(filterNavEntities([definition], [])).toHaveLength(0);
  });

  it("resolves entity action permissions", () => {
    expect(
      resolveEntityActionPermissions("organization", [
        "organization.read",
        "organization.create",
      ]),
    ).toMatchObject({
      canRead: true,
      canCreate: true,
      canUpdate: false,
      canDelete: false,
    });
  });

  it("supports custom component registration", () => {
    registerComponent("richText", "RichTextEditor");
    expect(resolveComponentId("richText", "string")).toBe("RichTextEditor");
  });
});
