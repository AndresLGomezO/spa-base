import { defineEntity } from "@repo/entities";
import { z } from "zod";

export const Customer = defineEntity({
  name: "customer",
  fields: {
    name: { type: "string", required: true },
    email: { type: "string" },
    isActive: { type: "boolean", default: true },
  },
  ui: {
    nav: { label: "Customers", icon: "users" },
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
        placeholder: "Customer name",
      },
      email: {
        label: "Email",
        component: "input",
        placeholder: "customer@example.com",
      },
      isActive: { label: "Active", component: "toggle" },
    },
  },
});

export const CUSTOMERS_COLLECTION = Customer.metadata.collection;
export const CUSTOMER_PERMISSIONS = Customer.metadata.permissions;

export const customerSchema = Customer.schema;
export const customerCreateSchema = Customer.createSchema;
export const customerUpdateSchema = Customer.updateSchema;

export const CUSTOMER_SCHEMA_VERSION = 1 as const;

const customerSchemaObject = customerSchema as unknown as z.ZodObject<
  Record<string, z.ZodTypeAny>
>;

export const persistedCustomerSchemaV1 = customerSchemaObject
  .extend({
    _schemaVersion: z.literal(CUSTOMER_SCHEMA_VERSION),
  })
  .strict();

export type CustomerRecord = z.infer<typeof customerSchema>;
export type PersistedCustomer = CustomerRecord & {
  readonly _schemaVersion: typeof CUSTOMER_SCHEMA_VERSION;
};
export type CustomerCreate = z.infer<typeof customerCreateSchema>;
export type CustomerUpdate = z.infer<typeof customerUpdateSchema>;
