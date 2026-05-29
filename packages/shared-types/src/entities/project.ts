/** Seed entity: Project. See src/entities/README.md for the add-entity template. */
import { defineEntity } from "@repo/entities";
import { z } from "zod";

export const Project = defineEntity({
  name: "project",
  fields: {
    name: { type: "string", required: true },
    budget: { type: "number", required: true },
    organizationId: {
      type: "relation",
      required: true,
      relation: {
        target: "organization",
        type: "many-to-one",
        onDelete: "restrict",
      },
    },
    startedAt: { type: "date" },
    isCompleted: { type: "boolean", default: false },
  },
  ui: {
    nav: { label: "Projects", icon: "folder" },
    views: [
      {
        type: "table",
        name: "default",
        fields: ["name", "budget", "organizationId", "isCompleted"],
        filters: [{ field: "organizationId", label: "Organization" }],
        defaultSort: { field: "name", direction: "asc" },
      },
    ],
    forms: {
      create: {
        sections: [
          {
            title: "Project",
            fields: [
              "name",
              "budget",
              "organizationId",
              "startedAt",
              "isCompleted",
            ],
          },
        ],
      },
      edit: {
        sections: [
          {
            title: "Project",
            fields: [
              "name",
              "budget",
              "organizationId",
              "startedAt",
              "isCompleted",
            ],
          },
        ],
      },
    },
    fields: {
      name: { label: "Name", component: "input" },
      budget: { label: "Budget", component: "number" },
      organizationId: { label: "Organization", component: "relation" },
      startedAt: { label: "Started", component: "date" },
      isCompleted: { label: "Completed", component: "toggle" },
    },
  },
});

export const PROJECTS_COLLECTION = Project.metadata.collection;

export const projectSchema = Project.schema;
export const projectCreateSchema = Project.createSchema;
export const projectUpdateSchema = Project.updateSchema;

export const PROJECT_PERMISSIONS = Project.metadata.permissions;

export const PROJECT_SCHEMA_VERSION = 1 as const;

const projectSchemaObject = projectSchema as unknown as z.ZodObject<
  Record<string, z.ZodTypeAny>
>;

export const persistedProjectSchemaV1 = projectSchemaObject
  .extend({
    _schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
  })
  .strict();

export type ProjectRecord = z.infer<typeof projectSchema>;
export type PersistedProject = ProjectRecord & {
  readonly _schemaVersion: typeof PROJECT_SCHEMA_VERSION;
};
export type ProjectCreate = z.infer<typeof projectCreateSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;
