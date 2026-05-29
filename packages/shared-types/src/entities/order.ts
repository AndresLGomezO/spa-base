/** Business entity: Order. See src/entities/README.md for the add-entity template. */
import { defineEntity } from "@repo/entities";
import { z } from "zod";

export const Order = defineEntity({
  name: "order",
  fields: {
    orderNumber: { type: "string", required: true },
    total: { type: "number", required: true },
    placedAt: { type: "date" },
    isFulfilled: { type: "boolean", default: false },
  },
});

export const ORDERS_COLLECTION = Order.metadata.collection;

export const orderSchema = Order.schema;
export const orderCreateSchema = Order.createSchema;
export const orderUpdateSchema = Order.updateSchema;

export const ORDER_PERMISSIONS = Order.metadata.permissions;

export const ORDER_SCHEMA_VERSION = 1 as const;

const orderSchemaObject = orderSchema as unknown as z.ZodObject<
  Record<string, z.ZodTypeAny>
>;

export const persistedOrderSchemaV1 = orderSchemaObject
  .extend({
    _schemaVersion: z.literal(ORDER_SCHEMA_VERSION),
  })
  .strict();

export type OrderRecord = z.infer<typeof orderSchema>;
export type PersistedOrder = OrderRecord & {
  readonly _schemaVersion: typeof ORDER_SCHEMA_VERSION;
};
export type OrderCreate = z.infer<typeof orderCreateSchema>;
export type OrderUpdate = z.infer<typeof orderUpdateSchema>;
