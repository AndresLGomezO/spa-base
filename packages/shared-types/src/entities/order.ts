/** Business entity: Order. See src/entities/README.md for the add-entity template. */
import { defineEntity } from "@repo/entities";
import type { z } from "zod";

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

export type OrderRecord = z.infer<typeof orderSchema>;
export type OrderCreate = z.infer<typeof orderCreateSchema>;
export type OrderUpdate = z.infer<typeof orderUpdateSchema>;
