/** Seed entity: Organization. See src/entities/README.md for the add-entity template. */
import { defineEntity } from "@repo/entities";
import { z } from "zod";

export const Organization = defineEntity({
  name: "organization",
  fields: {
    name: { type: "string", required: true },
    email: { type: "string" },
    isActive: { type: "boolean", default: true },
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
      name: {
        label: "Name",
        component: "input",
        placeholder: "Organization name",
      },
      email: {
        label: "Email",
        component: "input",
        placeholder: "contact@example.com",
      },
      isActive: { label: "Active", component: "toggle" },
    },
  },
});

export const ORGANIZATIONS_COLLECTION = Organization.metadata.collection;

export const organizationSchema = Organization.schema;
export const organizationCreateSchema = Organization.createSchema;
export const organizationUpdateSchema = Organization.updateSchema;

export const ORGANIZATION_PERMISSIONS = Organization.metadata.permissions;

export const ORGANIZATION_SCHEMA_VERSION = 1 as const;

const organizationSchemaObject = organizationSchema as unknown as z.ZodObject<
  Record<string, z.ZodTypeAny>
>;

export const persistedOrganizationSchemaV1 = organizationSchemaObject
  .extend({
    _schemaVersion: z.literal(ORGANIZATION_SCHEMA_VERSION),
  })
  .strict();

export type OrganizationRecord = z.infer<typeof organizationSchema>;
export type PersistedOrganization = OrganizationRecord & {
  readonly _schemaVersion: typeof ORGANIZATION_SCHEMA_VERSION;
};
export type OrganizationCreate = z.infer<typeof organizationCreateSchema>;
export type OrganizationUpdate = z.infer<typeof organizationUpdateSchema>;
