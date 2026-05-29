import {
  CUSTOMER_SCHEMA_VERSION,
  customerSchema,
  persistedCustomerSchemaV1,
  type CustomerRecord,
  type PersistedCustomer,
} from "@repo/shared-types";
import type { z } from "zod";

import { createVersionedConverter } from "../core/versioned-converter.js";
import { customerMigrations } from "./transforms/index.js";

export const customerCurrentVersion = CUSTOMER_SCHEMA_VERSION;

export const customerConverter = createVersionedConverter<
  CustomerRecord,
  PersistedCustomer
>({
  currentVersion: customerCurrentVersion,
  domainSchema: customerSchema,
  persistedSchema:
    persistedCustomerSchemaV1 as unknown as z.ZodType<PersistedCustomer>,
  migrations: customerMigrations,
  fromPersisted: (persisted) => {
    const domain = { ...persisted };
    Reflect.deleteProperty(domain, "_schemaVersion");
    return domain;
  },
  toPersisted: (domain) => domain,
});
