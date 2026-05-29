import {
  PLATFORM_ROLE_SCHEMA_VERSION,
  persistedPlatformRoleSchemaV1,
  platformRoleSchemaV1,
  type PersistedPlatformRole,
  type PlatformRole,
} from "@repo/shared-types";

import { createVersionedConverter } from "../core/versioned-converter.js";
import { platformRoleMigrations } from "./transforms/index.js";

export const platformRoleCurrentVersion = PLATFORM_ROLE_SCHEMA_VERSION;

export const platformRoleConverter = createVersionedConverter<
  PlatformRole,
  PersistedPlatformRole
>({
  currentVersion: platformRoleCurrentVersion,
  domainSchema: platformRoleSchemaV1,
  persistedSchema: persistedPlatformRoleSchemaV1,
  migrations: platformRoleMigrations,
  fromPersisted: (persisted) => {
    const domain = { ...persisted };
    Reflect.deleteProperty(domain, "_schemaVersion");
    return domain;
  },
  toPersisted: (domain) => domain,
});
