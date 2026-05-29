import type { EntityCatalogEntry } from "../entities/entity-catalog";

const MOCK_ORGANIZATION_DEFINITION: EntityCatalogEntry = {
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
    email: { type: "string", required: false, optional: true },
    isActive: {
      type: "boolean",
      required: false,
      optional: true,
      default: true,
    },
  },
  ui: {
    nav: { label: "Organizations", icon: "building" },
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

const MOCK_PROJECT_DEFINITION: EntityCatalogEntry = {
  name: "project",
  collection: "projects",
  permissions: [
    "project.read",
    "project.create",
    "project.update",
    "project.delete",
  ],
  fields: {
    name: { type: "string", required: true, optional: false },
    budget: { type: "number", required: true, optional: false },
    organizationId: {
      type: "relation",
      required: true,
      optional: false,
      relation: {
        target: "organization",
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
    nav: { label: "Projects", icon: "folder" },
    views: [
      {
        type: "table",
        name: "default",
        fields: ["name", "budget", "organizationId", "isCompleted"],
      },
    ],
    forms: {
      create: {
        sections: [{ fields: ["name", "budget", "organizationId"] }],
      },
      edit: {
        sections: [{ fields: ["name", "budget", "organizationId"] }],
      },
    },
    fields: {
      name: { label: "Name", component: "input" },
      budget: { label: "Budget", component: "number" },
      organizationId: { label: "Organization", component: "relation" },
      isCompleted: { label: "Completed", component: "toggle" },
    },
  },
};

export const MOCK_ENTITY_CATALOG: readonly EntityCatalogEntry[] = [
  MOCK_ORGANIZATION_DEFINITION,
  MOCK_PROJECT_DEFINITION,
];
