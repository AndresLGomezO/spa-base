import {
  ORGANIZATION_SCHEMA_VERSION,
  organizationSchema,
  persistedOrganizationSchemaV1,
  type OrganizationRecord,
  type PersistedOrganization,
} from "@repo/shared-types";
import type { z } from "zod";

import { createVersionedConverter } from "../core/versioned-converter.js";
import { organizationMigrations } from "./transforms/index.js";

export const organizationCurrentVersion = ORGANIZATION_SCHEMA_VERSION;

export const organizationConverter = createVersionedConverter<
  OrganizationRecord,
  PersistedOrganization
>({
  currentVersion: organizationCurrentVersion,
  domainSchema: organizationSchema,
  persistedSchema:
    persistedOrganizationSchemaV1 as unknown as z.ZodType<PersistedOrganization>,
  migrations: organizationMigrations,
  fromPersisted: (persisted) => {
    const domain = { ...persisted };
    Reflect.deleteProperty(domain, "_schemaVersion");
    return domain;
  },
  toPersisted: (domain) => domain,
});
