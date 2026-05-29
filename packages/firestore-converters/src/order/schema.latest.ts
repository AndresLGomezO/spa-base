import {
  ORDER_SCHEMA_VERSION,
  orderSchema,
  persistedOrderSchemaV1,
  type OrderRecord,
  type PersistedOrder,
} from "@repo/shared-types";
import type { z } from "zod";

import { createVersionedConverter } from "../core/versioned-converter.js";
import { orderMigrations } from "./transforms/index.js";

export const orderCurrentVersion = ORDER_SCHEMA_VERSION;

export const orderConverter = createVersionedConverter<
  OrderRecord,
  PersistedOrder
>({
  currentVersion: orderCurrentVersion,
  domainSchema: orderSchema,
  persistedSchema:
    persistedOrderSchemaV1 as unknown as z.ZodType<PersistedOrder>,
  migrations: orderMigrations,
  fromPersisted: (persisted) => {
    const domain = { ...persisted };
    Reflect.deleteProperty(domain, "_schemaVersion");
    return domain;
  },
  toPersisted: (domain) => domain,
});
