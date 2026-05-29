/** Business entity: Customer. See src/entities/README.md for the add-entity template. */
import { defineEntity } from "@repo/entities";
import { z } from "zod";

export const Customer = defineEntity({
  name: "customer",
  fields: {
    name: { type: "string", required: true },
    email: { type: "string" },
    age: { type: "number" },
    isActive: { type: "boolean", default: true },
  },
});

export const CUSTOMERS_COLLECTION = Customer.metadata.collection;

export const customerSchema = Customer.schema;
export const customerCreateSchema = Customer.createSchema;
export const customerUpdateSchema = Customer.updateSchema;

export const CUSTOMER_PERMISSIONS = Customer.metadata.permissions;

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
