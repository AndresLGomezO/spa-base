import type { EntityCatalogEntry } from "../entities/entity-catalog";

const MOCK_WIDGET_DEFINITION: EntityCatalogEntry = {
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
    email: { type: "string", required: false, optional: true },
    isActive: {
      type: "boolean",
      required: false,
      optional: true,
      default: true,
    },
  },
  ui: {
    nav: { label: "Widgets", icon: "box" },
    views: [
      {
        type: "table",
        name: "default",
        fields: ["name", "email", "isActive"],
      },
    ],
    forms: {
      create: {
        sections: [{ title: "Details", fields: ["name", "email", "isActive"] }],
      },
      edit: {
        sections: [{ title: "Details", fields: ["name", "email", "isActive"] }],
      },
    },
    fields: {
      name: { label: "Name", component: "input" },
      email: { label: "Email", component: "input" },
      isActive: { label: "Active", component: "toggle" },
    },
  },
};

const MOCK_TEST_ITEM_DEFINITION: EntityCatalogEntry = {
  name: "testItem",
  collection: "testItems",
  permissions: [
    "testItem.read",
    "testItem.create",
    "testItem.update",
    "testItem.delete",
  ],
  fields: {
    name: { type: "string", required: true, optional: false },
    budget: { type: "number", required: true, optional: false },
    widgetId: {
      type: "relation",
      required: true,
      optional: false,
      relation: {
        target: "widget",
        type: "many-to-one",
        onDelete: "restrict",
      },
    },
    isCompleted: {
      type: "boolean",
      required: false,
      optional: true,
      default: false,
    },
  },
  ui: {
    nav: { label: "Test Items", icon: "folder" },
    views: [
      {
        type: "table",
        name: "default",
        fields: ["name", "budget", "widgetId", "isCompleted"],
      },
    ],
    forms: {
      create: {
        sections: [{ fields: ["name", "budget", "widgetId"] }],
      },
      edit: {
        sections: [{ fields: ["name", "budget", "widgetId"] }],
      },
    },
    fields: {
      name: { label: "Name", component: "input" },
      budget: { label: "Budget", component: "number" },
      widgetId: { label: "Widget", component: "relation" },
      isCompleted: { label: "Completed", component: "toggle" },
    },
  },
};

export const MOCK_ENTITY_CATALOG: readonly EntityCatalogEntry[] = [
  MOCK_WIDGET_DEFINITION,
  MOCK_TEST_ITEM_DEFINITION,
];
