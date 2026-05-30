import {
  TENANT_SCHEMA_VERSION,
  persistedTenantSchemaV2,
  tenantSchemaV2,
  type PersistedTenant,
  type Tenant,
} from "@repo/shared-types";

import { createVersionedConverter } from "../core/versioned-converter.js";
import { tenantMigrations } from "./transforms/index.js";

export const tenantCurrentVersion = TENANT_SCHEMA_VERSION;

export const tenantConverter = createVersionedConverter<
  Tenant,
  PersistedTenant
>({
  currentVersion: tenantCurrentVersion,
  domainSchema: tenantSchemaV2,
  persistedSchema: persistedTenantSchemaV2,
  migrations: tenantMigrations,
  fromPersisted: (persisted) => {
    const domain = { ...persisted };
    Reflect.deleteProperty(domain, "_schemaVersion");
    return domain;
  },
  toPersisted: (domain) => domain,
});
